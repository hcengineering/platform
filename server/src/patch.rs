use json_patch::PatchOperation as StandardPatchOperation;
use jsonptr::{Pointer, PointerBuf};
use serde::{Deserialize, Serialize};
use serde_json::{Number, Value, json};
use thiserror::Error;
use tracing::*;
/// 'add' operation - increments a numeric value
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddOperationExt {
    /// JSON-Pointer value [RFC6901](https://tools.ietf.org/html/rfc6901) that references a location
    /// within the target document where the operation is performed.
    pub path: PointerBuf,
    /// Value to add to the target location.
    pub value: Value,
    // When enabled, ensures that the operation does not overwrite existing fields
    #[serde(default)]
    pub safe: bool,
}

/// 'inc' operation - increments a numeric value
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub struct IncOperationExt {
    // JSON Pointer to the target location (must point to a numeric value)
    pub path: PointerBuf,
    // Amount to increment by (can be negative for decrement)
    // Should be a number
    pub value: Value,
    // When enabled, ensures that the operation does not create new fields
    #[serde(default)]
    pub safe: bool,
}

/// 'remove' operation - increments a numeric value
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub struct RemoveOperationExt {
    /// JSON-Pointer value [RFC6901](https://tools.ietf.org/html/rfc6901) that references a location
    /// within the target document where the operation is performed.
    pub path: PointerBuf,
    // When enabled, ensures that the operation does not create new fields
    #[serde(default)]
    pub safe: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "hop")]
#[serde(rename_all = "lowercase")]
pub enum HulyPatchOperation {
    /// 'add' operation
    Add(AddOperationExt),
    /// 'inc' operation
    Inc(IncOperationExt),
    /// 'remove' operation
    Remove(RemoveOperationExt),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PatchOperation {
    Huly(HulyPatchOperation),
    Standard(StandardPatchOperation),
}

impl<'de> serde::Deserialize<'de> for PatchOperation {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;

        let op = serde_json::from_value::<StandardPatchOperation>(value.clone());
        if let Ok(op) = op {
            Ok(Self::Standard(op))
        } else {
            let standard_error = op.err().unwrap();
            serde_json::from_value::<HulyPatchOperation>(value)
                .map_err(|huly_error| {
                    serde::de::Error::custom(format!(
                        "Failed to deserialize as StandardPatchOperation: {}. Also failed to deserialize as HulyPatchOperation: {}",
                        standard_error, huly_error
                    ))
                })
                .map(Self::Huly)
        }
    }
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum HulyPatchError {
    #[error("invalid number")]
    InvalidNumber,
    #[error("patch error: {0}")]
    PatchError(String),
}

impl From<json_patch::PatchError> for HulyPatchError {
    fn from(err: json_patch::PatchError) -> Self {
        HulyPatchError::PatchError(err.to_string())
    }
}

pub fn apply(doc: &mut Value, patches: &[PatchOperation]) -> Result<(), HulyPatchError> {
    for patch in patches {
        if let Some(op) = match patch {
            PatchOperation::Huly(huly_op) => match huly_op {
                HulyPatchOperation::Add(op) => add(doc, &op.path, &op.value, op.safe),
                HulyPatchOperation::Inc(op) => inc(doc, &op.path, &op.value, op.safe),
                HulyPatchOperation::Remove(op) => remove(doc, &op.path, op.safe),
            },
            PatchOperation::Standard(standard_op) => Ok(Some(standard_op.clone())),
        }? {
            if let Err(e) = json_patch::patch(doc, &[op.clone()]) {
                error!("Failed to apply patch {:?}: {}", patch, e);
                return Err(e.into());
            }
        }
    }
    Ok(())
}

fn add(
    doc: &Value,
    path: &Pointer,
    value: &Value,
    safe: bool,
) -> Result<Option<StandardPatchOperation>, HulyPatchError> {
    let target = doc.pointer(path.as_str());

    Ok(if safe && target.is_some() {
        None
    } else {
        Some(StandardPatchOperation::Add(json_patch::AddOperation {
            path: path.to_owned(),
            value: value.to_owned(),
        }))
    })
}

fn inc(
    doc: &Value,
    path: &Pointer,
    value: &Value,
    safe: bool,
) -> Result<Option<StandardPatchOperation>, HulyPatchError> {
    let target = doc.pointer(path.as_str());

    match (target, value.as_number()) {
        (None, _) if safe => Ok(None),

        (None, Some(value)) => {
            let op = StandardPatchOperation::Add(json_patch::AddOperation {
                path: path.to_owned(),
                value: serde_json::Value::Number(value.to_owned()),
            });

            Ok(Some(op))
        }

        (Some(_), None) => Err(HulyPatchError::InvalidNumber),

        (Some(serde_json::Value::Number(old_value)), Some(increment)) => {
            let new_value = add_json_numbers(old_value, increment)?;

            let op = StandardPatchOperation::Replace(json_patch::ReplaceOperation {
                path: path.to_owned(),
                value: json!(new_value),
            });

            Ok(Some(op))
        }

        (Some(_), Some(_)) => Err(HulyPatchError::InvalidNumber),
        (None, None) => Err(HulyPatchError::InvalidNumber),
    }
}

fn remove(
    doc: &Value,
    path: &Pointer,
    safe: bool,
) -> Result<Option<StandardPatchOperation>, HulyPatchError> {
    let target = doc.pointer(path.as_str());

    Ok(if safe && target.is_none() {
        None
    } else {
        Some(StandardPatchOperation::Remove(
            json_patch::RemoveOperation {
                path: path.to_owned(),
            },
        ))
    })
}

fn add_json_numbers(a: &Number, b: &Number) -> Result<Number, HulyPatchError> {
    a.as_i64()
        .and_then(|a| b.as_i64().map(|b| Number::from(a + b)))
        .or_else(|| {
            a.as_f64()
                .and_then(|a| b.as_f64().map(|b| a + b))
                .and_then(Number::from_f64)
        })
        .ok_or(HulyPatchError::InvalidNumber)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn test_add(
        doc: Value,
        path: PointerBuf,
        value: Value,
        safe: bool,
        expected: Result<Option<json_patch::PatchOperation>, HulyPatchError>,
    ) {
        let mut doc = doc.clone();
        let res = add(&mut doc, &path, &value, safe);

        match expected {
            Ok(op) => {
                assert!(res.is_ok());
                assert_eq!(op, res.unwrap());
            }
            Err(e) => {
                assert!(res.is_err());
                assert_eq!(Some(e), res.err());
            }
        }
    }

    fn test_inc(
        doc: Value,
        path: PointerBuf,
        value: Value,
        safe: bool,
        expected: Result<Option<json_patch::PatchOperation>, HulyPatchError>,
    ) {
        let mut doc = doc.clone();
        let res = inc(&mut doc, &path, &value, safe);

        match expected {
            Ok(op) => {
                assert!(res.is_ok());
                assert_eq!(op, res.unwrap());
            }
            Err(e) => {
                assert!(res.is_err());
                assert_eq!(Some(e), res.err());
            }
        }
    }

    fn test_remove(
        doc: Value,
        path: PointerBuf,
        safe: bool,
        expected: Result<Option<json_patch::PatchOperation>, HulyPatchError>,
    ) {
        let mut doc = doc.clone();
        let res = remove(&mut doc, &path, safe);

        match expected {
            Ok(op) => {
                assert!(res.is_ok());
                assert_eq!(op, res.unwrap());
            }
            Err(e) => {
                assert!(res.is_err());
                assert_eq!(Some(e), res.err());
            }
        }
    }

    #[test]
    fn test_add_non_existing_object_field() {
        test_add(
            json!({}),
            PointerBuf::from_tokens(["a"]),
            json!(1),
            false,
            Ok(Some(StandardPatchOperation::Add(
                json_patch::AddOperation {
                    path: PointerBuf::from_tokens(["a"]),
                    value: json!(1),
                },
            ))),
        );
    }

    #[test]
    fn test_add_non_existing_object_field_safe() {
        test_add(
            json!({}),
            PointerBuf::from_tokens(["a"]),
            json!(1),
            true,
            Ok(Some(StandardPatchOperation::Add(
                json_patch::AddOperation {
                    path: PointerBuf::from_tokens(["a"]),
                    value: json!(1),
                },
            ))),
        );
    }

    #[test]
    fn test_add_existing_object_field() {
        test_add(
            json!({ "a": 1 }),
            PointerBuf::from_tokens(["a"]),
            json!(2),
            false,
            Ok(Some(StandardPatchOperation::Add(
                json_patch::AddOperation {
                    path: PointerBuf::from_tokens(["a"]),
                    value: json!(2),
                },
            ))),
        );
    }

    #[test]
    fn test_add_existing_object_field_safe() {
        test_add(
            json!({ "a": 1 }),
            PointerBuf::from_tokens(["a"]),
            json!(2),
            true,
            Ok(None),
        );
    }

    #[test]
    fn test_add_invalid_path() {
        test_add(
            json!({ "a": 1 }),
            PointerBuf::from_tokens(["a", "b"]),
            json!(2),
            false,
            Ok(Some(StandardPatchOperation::Add(
                json_patch::AddOperation {
                    path: PointerBuf::from_tokens(["a", "b"]),
                    value: json!(2),
                },
            ))),
        );
    }

    #[test]
    fn test_add_invalid_path_safe() {
        test_add(
            json!({ "a": 1 }),
            PointerBuf::from_tokens(["a", "b"]),
            json!(2),
            true,
            Ok(Some(StandardPatchOperation::Add(
                json_patch::AddOperation {
                    path: PointerBuf::from_tokens(["a", "b"]),
                    value: json!(2),
                },
            ))),
        );
    }

    #[test]
    fn test_inc_existing_object_field() {
        test_inc(
            json!({ "a": 1 }),
            PointerBuf::from_tokens(["a"]),
            json!(1),
            false,
            Ok(Some(StandardPatchOperation::Replace(
                json_patch::ReplaceOperation {
                    path: PointerBuf::from_tokens(["a"]),
                    value: json!(2),
                },
            ))),
        );
    }

    #[test]
    fn test_inc_non_existing_object_field() {
        test_inc(
            json!({}),
            PointerBuf::from_tokens(["a"]),
            json!(1),
            false,
            Ok(Some(StandardPatchOperation::Add(
                json_patch::AddOperation {
                    path: PointerBuf::from_tokens(["a"]),
                    value: json!(1),
                },
            ))),
        );
    }

    #[test]
    fn test_inc_non_existing_object_field_safe() {
        test_inc(
            json!({}),
            PointerBuf::from_tokens(["a"]),
            json!(1),
            true,
            Ok(None),
        );
    }

    #[test]
    fn test_inc_existing_array_item() {
        test_inc(
            json!({ "a": [0, 1, 2] }),
            PointerBuf::from_tokens(["a", "0"]),
            json!(1),
            false,
            Ok(Some(StandardPatchOperation::Replace(
                json_patch::ReplaceOperation {
                    path: PointerBuf::from_tokens(["a", "0"]),
                    value: json!(1),
                },
            ))),
        );
    }

    #[test]
    fn test_inc_non_existing_array_item() {
        test_inc(
            json!({ "a": [0, 1, 2] }),
            PointerBuf::from_tokens(["a", "3"]),
            json!(3),
            false,
            Ok(Some(StandardPatchOperation::Add(
                json_patch::AddOperation {
                    path: PointerBuf::from_tokens(["a", "3"]),
                    value: json!(3),
                },
            ))),
        );
    }

    #[test]
    fn test_inc_non_existing_array_item_safe() {
        test_inc(
            json!({ "a": [0, 1, 2] }),
            PointerBuf::from_tokens(["a", "3"]),
            json!(3),
            true,
            Ok(None),
        );
    }

    #[test]
    fn test_inc_non_number_field() {
        test_inc(
            json!({ "a": "b" }),
            PointerBuf::from_tokens(["a"]),
            json!(1),
            false,
            Err(HulyPatchError::InvalidNumber),
        );
    }

    #[test]
    fn test_inc_by_non_number() {
        test_inc(
            json!({ "a": "1" }),
            PointerBuf::from_tokens(["a"]),
            json!("one"),
            false,
            Err(HulyPatchError::InvalidNumber),
        );
    }

    #[test]
    fn test_remove_existing_object_field() {
        test_remove(
            json!({ "a": 1 }),
            PointerBuf::from_tokens(["a"]),
            false,
            Ok(Some(StandardPatchOperation::Remove(
                json_patch::RemoveOperation {
                    path: PointerBuf::from_tokens(["a"]),
                },
            ))),
        );
    }

    #[test]
    fn test_remove_non_existing_object_field() {
        test_remove(
            json!({}),
            PointerBuf::from_tokens(["a"]),
            false,
            Ok(Some(StandardPatchOperation::Remove(
                json_patch::RemoveOperation {
                    path: PointerBuf::from_tokens(["a"]),
                },
            ))),
        );
    }

    #[test]
    fn test_remove_non_existing_object_field_safe() {
        test_remove(json!({}), PointerBuf::from_tokens(["a"]), true, Ok(None));
    }

    #[test]
    fn test_add_json_numbers_i_i() {
        let res = add_json_numbers(&Number::from(1), &Number::from(1));
        assert_eq!(res, Ok(Number::from(2)));
    }

    #[test]
    fn test_add_json_numbers_i_f() {
        let res = add_json_numbers(&Number::from(1), &Number::from_f64(1.0).unwrap());
        assert_eq!(res, Ok(Number::from_f64(2.0).unwrap()));
    }

    #[test]
    fn test_add_json_numbers_f_i() {
        let res = add_json_numbers(&Number::from_f64(1.0).unwrap(), &Number::from(1));
        assert_eq!(res, Ok(Number::from_f64(2.0).unwrap()));
    }

    #[test]
    fn test_add_json_numbers_f_f() {
        let res = add_json_numbers(
            &Number::from_f64(1.0).unwrap(),
            &Number::from_f64(1.0).unwrap(),
        );
        assert_eq!(res, Ok(Number::from_f64(2.0).unwrap()));
    }

    #[test]
    fn test_patch() {
        let mut doc = json!({});

        let patches = vec![
            PatchOperation::Huly(HulyPatchOperation::Add(AddOperationExt {
                path: PointerBuf::from_tokens(["a"]),
                value: json!([]),
                safe: false,
            })),
            PatchOperation::Huly(HulyPatchOperation::Inc(IncOperationExt {
                path: PointerBuf::from_tokens(["a", "0"]),
                value: json!(1),
                safe: true,
            })),
            PatchOperation::Huly(HulyPatchOperation::Add(AddOperationExt {
                path: PointerBuf::from_tokens(["a", "0"]),
                value: json!(0),
                safe: false,
            })),
            PatchOperation::Huly(HulyPatchOperation::Inc(IncOperationExt {
                path: PointerBuf::from_tokens(["a", "0"]),
                value: json!(2),
                safe: true,
            })),
        ];

        let res = apply(&mut doc, &patches);
        assert!(res.is_ok());
        assert_eq!(
            doc,
            json!({
                "a": [2]
            })
        );
    }

    #[test]
    fn test_patch_err() {
        let mut doc = json!({});

        let patches = vec![
            PatchOperation::Standard(StandardPatchOperation::Add(json_patch::AddOperation {
                path: PointerBuf::from_tokens(["a"]),
                value: json!([]),
            })),
            PatchOperation::Standard(StandardPatchOperation::Add(json_patch::AddOperation {
                path: PointerBuf::from_tokens(["a", "b"]),
                value: json!(1),
            })),
        ];

        let res = apply(&mut doc, &patches);
        assert_eq!(
            res,
            Err(HulyPatchError::PatchError(String::from(
                "operation '/0' failed at path '/a/b': path is invalid"
            )))
        );
    }

    #[test]
    fn test_deserialize_add_safe() {
        let patch = r#"{ "hop": "add", "path": "/a", "value": 1, "safe": true }"#;
        let res = serde_json::from_str::<PatchOperation>(patch);
        assert!(res.is_ok());
        assert_eq!(
            res.unwrap(),
            PatchOperation::Huly(HulyPatchOperation::Add(AddOperationExt {
                path: PointerBuf::from_tokens(["a"]),
                value: json!(1),
                safe: true,
            }))
        );
    }

    #[test]
    fn test_deserialize_add_unsafe() {
        let patch = r#"{ "hop": "add", "path": "/a", "value": 1 }"#;
        let res = serde_json::from_str::<PatchOperation>(patch);
        assert!(res.is_ok());
        assert_eq!(
            res.unwrap(),
            PatchOperation::Huly(HulyPatchOperation::Add(AddOperationExt {
                path: PointerBuf::from_tokens(["a"]),
                value: json!(1),
                safe: false,
            }))
        );
    }

    #[test]
    fn test_deserialize_inc_safe() {
        let patch = r#"{ "hop": "inc", "path": "/a", "value": 1, "safe": true }"#;
        let res = serde_json::from_str::<PatchOperation>(patch);
        assert!(res.is_ok());
        assert_eq!(
            res.unwrap(),
            PatchOperation::Huly(HulyPatchOperation::Inc(IncOperationExt {
                path: PointerBuf::from_tokens(["a"]),
                value: json!(1),
                safe: true,
            }))
        );
    }

    #[test]
    fn test_deserialize_inc_unsafe() {
        let patch = r#"{ "hop": "inc", "path": "/a", "value": 1 }"#;
        let res = serde_json::from_str::<PatchOperation>(patch);
        assert!(res.is_ok());
        assert_eq!(
            res.unwrap(),
            PatchOperation::Huly(HulyPatchOperation::Inc(IncOperationExt {
                path: PointerBuf::from_tokens(["a"]),
                value: json!(1),
                safe: false,
            }))
        );
    }
}
