use json_patch::PatchOperation;
use jsonptr::{Pointer, PointerBuf};
use serde::{Deserialize, Serialize};
use serde_json::{Number, Value, json};
use thiserror::Error;

/// 'add' operation - increments a numeric value
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddOperationExt {
    /// JSON-Pointer value [RFC6901](https://tools.ietf.org/html/rfc6901) that references a location
    /// within the target document where the operation is performed.
    pub path: PointerBuf,
    /// Value to add to the target location.
    pub value: Value,
    // When enabled, ensures that the operation does not overwrite existing fields
    pub safe: Option<bool>,
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
    // Should be a boolean
    pub safe: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "op")]
#[serde(rename_all = "lowercase")]
pub enum HulyPatchOperation {
    /// 'remove' operation
    Remove(json_patch::RemoveOperation),
    /// 'replace' operation
    Replace(json_patch::ReplaceOperation),
    /// 'move' operation
    Move(json_patch::MoveOperation),
    /// 'copy' operation
    Copy(json_patch::CopyOperation),
    /// 'test' operation
    Test(json_patch::TestOperation),
    /// 'add' operation
    Add(AddOperationExt),
    /// 'inc' operation
    Inc(IncOperationExt),
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum HulyPatchError {
    #[error("invalid number")]
    InvalidNumber,
    #[error("patch error")]
    PatchError,
}

pub fn apply(doc: &mut Value, patches: &[HulyPatchOperation]) -> Result<(), HulyPatchError> {
    for patch in patches {
        let op = match patch {
            HulyPatchOperation::Add(op) => {
                add(doc, &op.path, &op.value, op.safe.unwrap_or_default())
            }
            HulyPatchOperation::Inc(op) => {
                inc(doc, &op.path, &op.value, op.safe.unwrap_or_default())
            }
            HulyPatchOperation::Copy(op) => Ok(Some(PatchOperation::Copy(op.clone()))),
            HulyPatchOperation::Move(op) => Ok(Some(PatchOperation::Move(op.clone()))),
            HulyPatchOperation::Remove(op) => Ok(Some(PatchOperation::Remove(op.clone()))),
            HulyPatchOperation::Replace(op) => Ok(Some(PatchOperation::Replace(op.clone()))),
            HulyPatchOperation::Test(op) => Ok(Some(PatchOperation::Test(op.clone()))),
        };

        match op {
            Ok(Some(op)) => {
                if let Err(_) = json_patch::patch(doc, &[op]) {
                    return Err(HulyPatchError::PatchError);
                }
            }
            Ok(None) => { /* no-op */ }
            Err(e) => return Err(e),
        }
    }

    Ok(())
}

fn add(
    doc: &Value,
    path: &Pointer,
    value: &Value,
    safe: bool,
) -> Result<Option<json_patch::PatchOperation>, HulyPatchError> {
    let target = doc.pointer(path.as_str());
    if safe && target.is_some() {
        return Ok(None);
    }

    let op = PatchOperation::Add(json_patch::AddOperation {
        path: path.to_owned(),
        value: value.to_owned(),
    });

    Ok(Some(op))
}

fn inc(
    doc: &Value,
    path: &Pointer,
    value: &Value,
    safe: bool,
) -> Result<Option<json_patch::PatchOperation>, HulyPatchError> {
    let target = doc.pointer(path.as_str());
    if safe && target.is_none() {
        return Ok(None);
    }

    if value.as_number().is_none() {
        return Err(HulyPatchError::InvalidNumber);
    }

    match target {
        Some(target) => match target.as_number() {
            Some(target) => {
                let new_value = add_json_numbers(target, value.as_number().unwrap())
                    .ok_or(HulyPatchError::InvalidNumber)?;

                let op = PatchOperation::Replace(json_patch::ReplaceOperation {
                    path: path.to_owned(),
                    value: json!(new_value),
                });

                Ok(Some(op))
            }
            None => Err(HulyPatchError::InvalidNumber),
        },
        None => {
            let op = PatchOperation::Add(json_patch::AddOperation {
                path: path.to_owned(),
                value: value.to_owned(),
            });

            Ok(Some(op))
        }
    }
}

fn add_json_numbers(a: &Number, b: &Number) -> Option<Number> {
    // Try as integers first
    if let (Some(i1), Some(i2)) = (a.as_i64(), b.as_i64()) {
        // Check for overflow
        if let Some(sum) = i1.checked_add(i2) {
            return Some(Number::from(sum));
        }
    }

    // Fall back to floats
    let sum = a.as_f64()? + b.as_f64()?;
    Number::from_f64(sum)
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

    #[test]
    fn test_add_non_existing_object_field() {
        test_add(
            json!({}),
            PointerBuf::from_tokens(["a"]),
            json!(1),
            false,
            Ok(Some(PatchOperation::Add(json_patch::AddOperation {
                path: PointerBuf::from_tokens(["a"]),
                value: json!(1),
            }))),
        );
    }

    #[test]
    fn test_add_non_existing_object_field_safe() {
        test_add(
            json!({}),
            PointerBuf::from_tokens(["a"]),
            json!(1),
            true,
            Ok(Some(PatchOperation::Add(json_patch::AddOperation {
                path: PointerBuf::from_tokens(["a"]),
                value: json!(1),
            }))),
        );
    }

    #[test]
    fn test_add_existing_object_field() {
        test_add(
            json!({ "a": 1 }),
            PointerBuf::from_tokens(["a"]),
            json!(2),
            false,
            Ok(Some(PatchOperation::Add(json_patch::AddOperation {
                path: PointerBuf::from_tokens(["a"]),
                value: json!(2),
            }))),
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
            Ok(Some(PatchOperation::Add(json_patch::AddOperation {
                path: PointerBuf::from_tokens(["a", "b"]),
                value: json!(2),
            }))),
        );
    }

    #[test]
    fn test_add_invalid_path_safe() {
        test_add(
            json!({ "a": 1 }),
            PointerBuf::from_tokens(["a", "b"]),
            json!(2),
            true,
            Ok(Some(PatchOperation::Add(json_patch::AddOperation {
                path: PointerBuf::from_tokens(["a", "b"]),
                value: json!(2),
            }))),
        );
    }

    #[test]
    fn test_inc_existing_object_field() {
        test_inc(
            json!({ "a": 1 }),
            PointerBuf::from_tokens(["a"]),
            json!(1),
            false,
            Ok(Some(PatchOperation::Replace(
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
            Ok(Some(PatchOperation::Add(json_patch::AddOperation {
                path: PointerBuf::from_tokens(["a"]),
                value: json!(1),
            }))),
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
            Ok(Some(PatchOperation::Replace(
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
            Ok(Some(PatchOperation::Add(json_patch::AddOperation {
                path: PointerBuf::from_tokens(["a", "3"]),
                value: json!(3),
            }))),
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
    fn test_add_json_numbers_i_i() {
        let res = add_json_numbers(&Number::from(1), &Number::from(1));
        assert_eq!(res, Some(Number::from(2)));
    }

    #[test]
    fn test_add_json_numbers_i_f() {
        let res = add_json_numbers(&Number::from(1), &Number::from_f64(1.0).unwrap());
        assert_eq!(res, Some(Number::from_f64(2.0)).unwrap());
    }

    #[test]
    fn test_add_json_numbers_f_i() {
        let res = add_json_numbers(&Number::from_f64(1.0).unwrap(), &Number::from(1));
        assert_eq!(res, Some(Number::from_f64(2.0)).unwrap());
    }

    #[test]
    fn test_add_json_numbers_f_f() {
        let res = add_json_numbers(
            &Number::from_f64(1.0).unwrap(),
            &Number::from_f64(1.0).unwrap(),
        );
        assert_eq!(res, Some(Number::from_f64(2.0)).unwrap());
    }

    #[test]
    fn test_patch() {
        let mut doc = json!({});

        let patches = vec![
            HulyPatchOperation::Add(AddOperationExt {
                path: PointerBuf::from_tokens(["a"]),
                value: json!([]),
                safe: Some(false),
            }),
            HulyPatchOperation::Inc(IncOperationExt {
                path: PointerBuf::from_tokens(["a", "0"]),
                value: json!(1),
                safe: Some(true),
            }),
            HulyPatchOperation::Add(AddOperationExt {
                path: PointerBuf::from_tokens(["a", "0"]),
                value: json!(0),
                safe: Some(false),
            }),
            HulyPatchOperation::Inc(IncOperationExt {
                path: PointerBuf::from_tokens(["a", "0"]),
                value: json!(2),
                safe: Some(true),
            }),
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
}
