# zkbytes Message Lab

The homepage at `/` introduces the app with custom animated SVG art and direct
links to **Encrypt**, **Decrypt**, and receiving-key setup. It supports all three
themes, mobile layouts and reduced-motion preferences.

The three main areas are **Create identity**, **Encrypt** and **Decrypt**. Use **Connect wallet** in the
top bar to open wallet management; after connection it becomes **Manage wallet**.
The modal includes connection choices, the selected account/network, network
switching and disconnect. It yields to the wallet provider's own connection UI.

Receiving identities are available under **Create identity** (`/identities`). Enter an exact label
(for example `personal`) and choose **Create / restore
keys**. Approve one signature, then copy your public **Receive link**:
`https://<app-origin>/send#zkbytes.v1.<publicKey>`. Opening it takes the sender to
Encrypt with your recipient details already filled in and validated. The link
contains public receiving details; opening it never connects a wallet, signs or
uploads automatically. Existing compact `zkbytes.v1.<publicKey>` values are also
accepted in the recipient field. The
same wallet account and exact label restore the same key after reload. Labels are
case-sensitive and are not passwords. Private keys remain in memory and are cleared
by **Lock / clear keys**, wallet changes, disconnect or leaving the app.
Compatibility testing is optional under **Tools > Compatibility**. Neither key
restoration nor Encrypt requires running it first; every signature is still
validated. Reproducible wallet signatures remain necessary to restore the same keys.

After successful creation/restoration, the browser saves the wallet address,
connection type, exact label, receiving profile and public key. **Saved identities**
lets you restore an entry after reconnecting its wallet. Reloading does not connect,
sign or unlock anything automatically. The derived key must match the saved public
key; a mismatch leaves the saved entry intact and clears unlocked keys.

**Export all identities** downloads `zkbytes-identities.json`. On another device,
open Create identity, choose **Import identity backup**, review the entries, and
confirm the merge. Reconnect each wallet and restore the desired identities with
one signature each. The backup contains public keys and wallet/label associations,
not private keys, seed phrases, passwords or secret signatures. It cannot replace
access to the original wallet. Keep the file private if the associations are sensitive.

**Clear saved identities** requires confirmation, removes the entire saved identity
list and locks keys in memory. It does not delete messages, wallet-provider data or
the theme preference. Other open tabs invalidate their keys when the list changes.
Storage errors are shown explicitly; keys may still be used in the current session
if saving fails. Browser profiles/origins keep separate lists.

**Sign Receive link** optionally adds a wallet endorsement through a separate
approval: `zkbytes.v1.<publicKey>.<walletAddress>.<signature>`. The key and public
endorsement signature use unpadded Base64URL; v1 defines X25519. Signing makes the
wallet address public. Imports verify the signature and show the endorsing wallet,
or reject invalid links. This proves wallet endorsement, not private-key possession,
a person's identity or the sender of subsequent messages. **Use unsigned link**
returns to the shorter form. Secret key-derivation signatures are never exported.

On **Encrypt**, open a recipient's Receive link, or paste it and choose **Use recipient**
to validate it and review the public key. Enter a message and expiration, then **Confirm & sign to encrypt**.
Review the prepared seed, creator and destination origins before **Confirm upload**.
An active upload shows a selectable sealed link with a copy action and grouped
message details. On Create identity, Receive links use a shortened copyable field:
clicking copies the full URL and briefly shows “Copied!” without navigating away.
Hover to see the full value. The field follows the selected zkbytes theme.
Decrypted messages use text displays, not read-only input fields.

On **Decrypt** (`/open`), connect your wallet directly on the page, then restore a
saved receiving identity or enter its exact label under **Other identity label**.
Saved entries show **Locked / Ready**; entries for another account require the
matching wallet. A restored identity is selected automatically, including when
browser storage cannot save it. Paste a sealed link or the contents of an exported
envelope and click **Decrypt message**. The encrypted input stays in place through
wallet connection, key locking and wallet changes; decrypted content is cleared.
**Manage saved identities** opens the full backup and identity management page.
Opening a URL prefills the fragment but never signs, downloads or
decrypts automatically. The seed is decrypted before any storage request. The
downloaded object is verified before plaintext is displayed. Both compact formats,
earlier Base32 links and original full-reference envelopes are supported. Plaintext
clears on Clear message, key lock, wallet/account/network changes and navigation
away. Authentic expired content is labeled separately from verification failure.

Signature requests show a persistent, themed **Approve in your wallet** panel
with the wallet name and action. It does not take focus or open a second modal.
The initiating action shows **Waiting for wallet…** and duplicate requests remain
disabled until the wallet responds. After approval, the panel shows processing
progress and closes when finished. Rejection is reported beside the action.
Wallet/account/network changes clear stale feedback. Downloads, local decryption
and the development fixture never display a request for external wallet approval.

New links use `/open#<encrypted-seed>` (87 fragment characters) by default.
Enable **Include recipient public key in link** to use
`/open#<recipient-public-key>.<encrypted-seed>` (131 fragment characters).
Both fields use canonical unpadded Base64URL (`A-Z`, `a-z`, `0-9`, `-`, `_`);
`.` is an unambiguous separator. Switching formats does not sign, encrypt or upload
again. There is no sealed-envelope download action; copy the link to share it.

SDK 0.1.4 encrypts the raw 16-byte seed directly with HPKE. No origins, expiration,
creator descriptor or JSON are embedded. The recipient selects their receiving
identity for links without a public key; the key is still cryptographically bound
to the envelope. Including the public key can help identify the matching identity.
No separate link storage is used. The codec also opens earlier Base32 v2 seeds.

Recipient opening uses the app's configured storage origins. The downloaded
object supplies expiration and its creator key: its signature can be checked, but
the link no longer pins an expected creator. Sender identity remains unverified.
The original full sender reference is still used for recovery and deletion.

Pending or uncertain uploads stay on Encrypt: use **Check upload status**. Only an
authoritative not-found result enables retrying the exact encrypted message, without
another signature. Export the sender reference before leaving the page; it contains
the storage location and is needed for later recovery/deletion. No reference is
saved automatically. The sender retains access and is the default deletion manager.

A browser app for encrypted message exchange using `@zkbytes/sdk`.

On **Recover**, paste the exported sender reference JSON and choose **Check status**.
No wallet or signature is required. An active result verifies the stored item against
the reference; pending, deleted, expired and authoritative not-found are distinct.
Only not-found offers a link to prepare a new message. A reference alone cannot
recreate the original encrypted upload; failed checks remain uncertain.

On **Delete**, paste the sender reference and connect the manager wallet. **Check
deletion authority** verifies the item and requests one signature to derive its
manager key. Review the seed, expiration, public key and exact manager index, then
choose **Confirm deletion** or **Cancel**. Cancel sends no deletion request.
Confirmation uses the SDK challenge/action flow and clears the derived keys.
Navigation, key locking and wallet changes also clear prepared keys and invalidate
late results. Status is checked automatically for up to ten attempts after submission;
deletion itself is never automatically retried. The API confirms logical deletion,
not physical removal: cached content may remain available for up to 60 seconds.

The MVP includes the React shell, Terminal/Cyberpunk/Cosmic themes, configuration
validation, MetaMask Connect, WalletConnect through Reown AppKit and a development
fixture wallet. All integrations support the SDK's optional two-signature compatibility check.
Receiving identities, public cards, encrypted upload, sealed links and same-session
upload recovery and recipient decryption are implemented. Standalone imported-reference
recovery and manager deletion are implemented. Live storage/CORS acceptance remains separate from local tests.

## Run locally

Use Node.js 22.12+ (or 24+) and pnpm 11.27.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local Vite URL. No environment file is needed to explore the shell or
run fixture checks. Copy `.env.example` to `.env.local` when configuring storage.
Both storage endpoints must be HTTPS origins without paths or trailing slashes.
Placeholder or missing endpoints disable storage setup; the application remains usable.
Configuration status appears under Diagnostics. Every `VITE_` value is public.

The fixture is a public, insecure development identity. Never fund it or use it
for private messages. Its adapter and connection control are excluded from production
builds. Connection and signing are explicit button actions. Signatures and derived
private keys are never persisted by the app. The app stores the selected theme and
the saved identity metadata described above;
MetaMask Connect and Reown may store their own connection/session metadata. Their analytics are
disabled. The Encrypt page contains a local draft field; navigation away or a wallet
account change/disconnect clears it.

## Check MetaMask

1. Click Connect wallet in the top bar, then MetaMask. Approve connection in your extension.
2. If shown, click Switch to Monad Testnet and approve adding/switching the network.
   For the optional check, close the modal, open Tools > Compatibility, click Check
   compatibility and approve the two message signatures.
3. A reproducible, canonical EOA signer should show `Compatible · reproducible keys`.
4. Change account, change network or disconnect; the previous result must clear.

No funds, transactions, storage service or API key are needed. This MVP requests
Monad Testnet (`10143` / `0x279f`) using its official public RPC, configured in
`src/config/wallet.ts`. MetaMask Connect also requests Ethereum Mainnet as its
bootstrap fallback. Signing in the lab is enabled only on the configured Monad
network. Receiving-key derivation itself remains independent of chain selection.
See [Monad network information](https://docs.monad.xyz/developer-essentials/testnet).

Initialization happens on the Connect click, and no wallet prompts occur on reload.
Account changes invalidate pending results; the app keeps the prompt lock until
the outstanding wallet request finishes. Declined requests can be retried explicitly.
Disconnect clears the lab session and asks MetaMask Connect to revoke its session.

MetaMask Connect manages extension/mobile selection and QR/deeplink UI. Diagnostics
reports transport as managed because the EVM client does not expose a public active
transport accessor. Mobile testing needs a phone-accessible app URL; the computer's
localhost URL is not reachable from a phone browser. Mobile acceptance remains pending.

Fonts are self-hosted in `public/fonts` with their license notices. The UI uses
local shadcn-style component source with Radix as its component base, Tailwind CSS
tokens, and Lucide icons. All themes share the same copy and behavior.

## Check WalletConnect

1. Create a project in the [Reown dashboard](https://dashboard.reown.com/) and allow
   the exact app origin (for example `http://127.0.0.1:5173`).
2. Set `VITE_REOWN_PROJECT_ID` in `.env.local` to its 32-character project ID and
   restart Vite. This is a browser-visible identifier, not a private key.
3. Open Connect wallet / Manage wallet in the top bar, disconnect any active lab
   wallet, then click WalletConnect. Use the QR code or
   select your mobile wallet. Closing the modal cancels the local connection attempt.
4. Optionally close wallet management, open Tools > Compatibility, run Check
   compatibility and approve both signatures. This is not required for key restoration.
5. Verify account changes, remote disconnect and rejected requests clear/invalidate
   results safely. Test a non-MetaMask wallet as well as MetaMask Mobile.

The AppKit integration uses the Ethers adapter, disables injected wallets, embedded
login, analytics and automatic reconnection, and loads only after a Connect click.
Monad Testnet is the requested network. WalletConnect signing checks the selected
approved account without requiring an optional session chain list or a network switch.
Connection alone does not sign. The app never records pairing URIs or provider objects.
AppKit owns QR/deeplink selection; diagnostics reports its transport as managed.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Use `pnpm preview` to serve the production build. Configure deployed hosting to
serve `index.html` for application routes, including `/open`. The URL fragment is
used for sealed links and is parsed locally only after an explicit Decrypt action.
Real-wallet acceptance is manual; mocked provider tests cover signing requests,
account changes, disconnects, stale results and provider errors. Storage acceptance
remains a separate live acceptance task. The latest local implementation checks
passed 95 tests, lint, typecheck and build (2026-09-22). Browser fixture checks are
not yet a committed, repeatable browser-test suite; no CI workflow exists in this checkout.

## Acceptance status

Reported success is partial acceptance, not a complete supported-wallet matrix.
Exact browser/wallet versions still need to be recorded.

| Integration                         | Recorded evidence                                                | Still to verify                                                          |
| ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| MetaMask Connect, desktop extension | Compatibility, account switching and disconnect reported working | Fresh-session exchange, recovery and deletion; record versions           |
| MetaMask Connect, mobile            | Not recorded                                                     | Full connection/signing/exchange/deletion flow                           |
| WalletConnect                       | Connection reported working; wallet not recorded                 | Identify wallet; rejection, remote disconnect and full exchange/deletion |
| WalletConnect, MetaMask Mobile      | Not separately recorded                                          | Full flow                                                                |

The user also reported receiving-identity testing and successful storage uploads.
New recovery/deletion flows have automated coverage; their live acceptance and
deletion/cache-expiry checks remain pending. Production deployment settings and
the deployed commit were not rechecked during documentation cleanup.

Remaining delivery work: safe diagnostic history/export, rate-limit countdowns,
repeatable browser tests, CI, release verification and the live acceptance matrix.
