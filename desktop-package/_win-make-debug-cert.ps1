$cert = New-SelfSignedCertificate -Type CodeSigningCert `
    -Subject "CN=Hardcore Engineering Inc" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -Provider "Microsoft Enhanced RSA and AES Cryptographic Provider" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(5)

$password = ConvertTo-SecureString -String "poiuytrewq0987654321POIUYTREWQ" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "DebugCertificate.pfx" -Password $password