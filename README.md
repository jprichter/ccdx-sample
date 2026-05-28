# sample project for tooling api issue

## Summary

Updating the `Source` field of `LightningComponentResource` via the Tooling API fails with `FIELD_INTEGRITY_EXCEPTION: Invalid reference … of type sobjectField` for any `@salesforce/schema/` import of a custom field on a custom object — even when the field demonstrably exists in the org and the user has access. The Metadata API accepts the exact same source.

## Environment

- Edition: Developer Edition scratch org (no namespace)
- Instance: USA488S
- Org ID: `00DRt00000Qxot4MAB`
- API version: `v66.0`
- Tools: Salesforce CLI `sf api request rest`, `sf project deploy start`

## Setup

[See here for sample project](https://github.com/jprichter/ccdx-sample/)

`force-app/main/default/objects/CustomObject__c/CustomObject__c.object-meta.xml` — a minimal custom object
`force-app/main/default/objects/CustomObject__c/fields/CustomField__c.field-meta.xml` — a Text(255) field
`force-app/main/default/lwc/ccdxSample/ccdxSample.js`:

```js
import { LightningElement } from 'lwc';
import CUSTOM_FIELD from '@salesforce/schema/CustomObject__c.CustomField__c';

export default class CcdxSample extends LightningElement {
    connectedCallback() {
        console.log('Custom Field API Name: ', CUSTOM_FIELD.fieldApiName);
    }
}
```

plus the matching `.js-meta.xml` and a trivial `.html`.

## Steps to reproduce**

1. Deploy the object, field, and LWC bundle via Metadata API:

   ```bash
   sf project deploy start --source-dir force-app -o <org>
   ```

   → succeeds.

2. Confirm the field exists and is accessible:

   ```bash
   sf data query --use-tooling-api -o <org> \
     -q "SELECT QualifiedApiName, DataType FROM FieldDefinition
         WHERE EntityDefinition.QualifiedApiName='CustomObject__c'
         AND QualifiedApiName='CustomField__c'"
   ```

   → returns one row, `Text(255)`.

3. Fetch the `LightningComponentResource` Id for `ccdxSample.js`:

   ```bash
   sf data query --use-tooling-api -o <org> \
     -q "SELECT Id, FilePath FROM LightningComponentResource
         WHERE LightningComponentBundle.DeveloperName='ccdxSample'"
   ```

4. PATCH that record's `Source` with the **same content** the Metadata deploy just accepted:

   ```bash
   sf api request rest \
     "/services/data/v66.0/tooling/sobjects/LightningComponentResource/<id>" \
     --method PATCH --body - -o <org> <<< '{"Source":"import { LightningElement } from \"lwc\";\nimport CUSTOM_FIELD from \"@salesforce/schema/CustomObject__c.CustomField__c\";\nexport default class CcdxSample extends LightningElement {}\n"}'
   ```

**Expected:** HTTP 204 (matches behavior of standard-field imports such as `@salesforce/schema/Account.Name`).

**Actual:**

```json
[{
  "message": "Invalid reference CustomObject__c.CustomField__c of type sobjectField in file ccdxSample.js: Source",
  "errorCode": "FIELD_INTEGRITY_EXCEPTION",
  "fields": ["Source"]
}]
```

## Isolating observations

- Removing the custom-field import (keeping only `@salesforce/schema/Account.Name`) → Tooling PATCH succeeds.
- Keeping only the custom-field import → Tooling PATCH fails the same way.
- Deploying the identical source via Metadata API (`project deploy start`) → succeeds.
- The exact same record (same Id) the Tooling API rejects to write *currently contains* that import on the server (placed there by the Metadata deploy in step 1).
- The running user is the org admin; field is a standard custom Text(255), no FLS restrictions, no namespace.

**Impact**

Any tool that performs LWC fast-saves via the Tooling API is blocked from saving an LWC when it imports a custom field on a custom object — even when the field is present in the org. The workaround is to fall back to a Metadata API deploy, which is slower.

Sample Project to help reproduce the issue is found [here.](https://github.com/jprichter/ccdx-sample/)
