signtool sign /f DebugCertificate.pfx /p poiuytrewq0987654321POIUYTREWQ /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 deploy\Huly-windows-0.6.0.msix
signtool verify /pa deploy\Huly-windows-0.6.0.msix
