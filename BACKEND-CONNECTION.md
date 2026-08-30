# Backend connection

Version 2.3 uses Firebase directly for Team Hours. Follow `START-HERE-FIREBASE.md`.
The supplied public config is in `src/services/firebaseConfig.ts` and defaults to
the `company-team` team document. No Analytics or administrative credentials are included.

## Team API

The earlier generic GET/PUT adapter has been replaced by Firebase Auth and Firestore.
Users sign in through Team Hours with Email/Password. Firebase UIDs identify record
owners; member names come from administrator-managed membership documents. There
is public email/password sign-up but no client-side membership editing. Firebase rules enforce active
membership and owner-only writes, including checking the OLD owner during updates.

Shared records live at `teams/{teamId}/hours/{uid}_{encodedLocalEntryId}`. Their
allowlisted schema is `id`, `teamId`, `userId`, `memberName`, `date`, `clockIn`,
`clockOut`, `breakMinutes`, `regularHours`, `overtimeHours`, `totalHours`, `updatedAt`, `notes`.
Notes are optional on legacy records and displayed as plain text. Never put pay or
private information in notes: free-text content is shared as entered.
Unknown fields are rejected by both the app reader and supplied rules. The writer
constructs records explicitly; it never spreads private or calculated-pay objects.
Even admin-role app accounts can write only their own hours. Console/IAM administrators
can manage memberships; an `admin` string alone grants no extra client powers.

The sync journal is device- and account-specific. It records intent before requests,
then acknowledged fingerprints, allowing retries after interrupted requests. Edits
and deletions affect only known local records, never all cloud records for an employee.
An empty second device does not delete the first device's records. Team Hours reads
across devices; cloud hour records are not imported into private dashboards.

Local data is separated by UID. Legacy keys are copied only with explicit consent,
retained as a backup, and cannot be claimed by another UID. Signing out keeps
account data but displays a separate guest profile. This is app-level separation,
not encryption against someone with physical/storage access to the device.

## OCR API

`POST EXPO_PUBLIC_OCR_API_URL` receives multipart field `image` and returns `{ "rows": [{ "date": "YYYY-MM-DD", "clockIn": "HH:MM", "clockOut": "HH:MM", "breakMinutes": 30 }] }`. Keep Google Vision, Azure AI Vision, AWS Textract, or other OCR credentials on this server. Validate file type/size, require authentication, rate-limit requests, delete source images promptly, and return normalized values. The client validates the response again and never saves it until the user reviews and imports selected valid rows.

OCR has not been connected or deployed in this release. The existing OCR adapter
also needs authenticated request handling, native/web upload verification and provider
integration before it can be enabled for production. Setting Firebase client config
alone does not enable OCR. Do not place an OCR secret in `EXPO_PUBLIC_*` variables.
