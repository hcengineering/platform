# Intercom Webhook Service

## Developer resources

### Intercom configuration

The service requires the following webhook notifications to be configured in Intercom:

- conversation.admin.replied
- conversation.read

### Forward Intercom events to platform

```bash
smee -u https://smee.io/nrhvLree3Wvt28 -p 3600 -P /intercom
```
