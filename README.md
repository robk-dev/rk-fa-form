# Contact form Function

Receives the form at `POST https://rk-fa-form.azurewebsites.net/api/contact-form` and saves one private JSON blob per submission. No email is sent.

## Storage and access

Azure Portal → Storage accounts → **storageaccountrkfafaa40** → Data storage → Containers → **contact-submissions**. Open the date folder and download a JSON file to read a submission. Each contains `id`, `receivedAt` (UTC), `name`, `email`, `phone`, and `message`. Portal users need appropriate storage data access (or an account role allowing key access).

The container is private. The Function's system-assigned identity has Storage Blob Data Contributor at this container only. It has Storage Blob Data Reader on the separate private `function-releases` container. Package URLs contain no SAS tokens and do not expire. Existing Azure host-storage settings remain in place.

## Contract

Accepts URL-encoded `name`, `email`, `phone`, `message`. Name and email are required; phone/message may be blank. Limits: name/email 100 characters, phone 20, message 100, encoded body 8192. Duplicate or unexpected fields are rejected. Invalid forms return 400, unsupported content types 415, and oversized bodies 413. GET returns 405 without saving anything.

A successful write returns 303 to `https://www.robk.dev/?contact=sent#contact`, where the website confirms receipt. Storage failure returns a readable 503 without claiming success. Submitted values and credentials are not logged.

## Development and deployment

Use Node 22 (`nvm install && nvm use`), `npm ci`, and `npm test`. The handler uses Azure Functions runtime 4 / Node programming model 4. `npm start` requires Azure Functions Core Tools v4. Local storage access uses DefaultAzureCredential and requires an authorized identity plus `CONTACT_STORAGE_URL`.

GitHub Actions validates every push. To deploy after `az login`, run:

```sh
python3 scripts/deploy.py
```

The script tests and builds, creates a production-only ZIP, uploads it to `function-releases`, selects runtime 4 / Node 22, updates the package URL and restarts the existing Function App. It uses account-key access only in the deployer's subprocess environment for upload; the Function uses managed identity. The retained Azure Pipelines definition invokes the same script with the existing service connection. GitHub validation alone does not deploy.

The deploy script waits for the host to start, then synchronizes triggers through Azure's `syncfunctiontriggers` action. Verify invalid-input rejection, a real saved test submission and the 303 redirect. Delete only that test blob afterward. For rollback, restore the previous verified package URL; leave the runtime at v4 and retain storage permissions.

## Repair history

The prior package SAS expired in October 2021, the app was on retired Functions 3 / Node 12, and the old Firebase database was deactivated. The repair replaces Firebase with private Azure Blob Storage and removes the expiring deployment credential. Original Azure settings were backed up locally before modification. The old package is retained but is not a supported rollback target.

Verified on 2026-11-03: live invalid POST → 400; valid POST → 303; saved JSON fields and timestamp verified; anonymous blob download → 404. Test records were deleted. Handler tests pass and npm audit reports zero known vulnerabilities.
