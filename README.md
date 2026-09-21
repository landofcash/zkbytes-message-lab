# zkbytes Message Lab

Receiving identities are available on **My keys** after the wallet compatibility
check. Enter an exact label (for example `personal`) and choose **Create / restore
keys**. Approve one signature, then copy or export the public Receive card. The
same wallet account and exact label restore the same key after reload. Labels are
case-sensitive and are not passwords. Private keys remain in memory and are cleared
by **Lock / clear keys**, wallet changes, disconnect or leaving the page.

On **Send**, paste and import a recipient's Receive card to validate it and review
the public key. Enter a message and expiration, then **Confirm & sign to encrypt**.
Review the prepared seed, creator and destination origins before **Confirm upload**.
An active upload enables sealed-link copy and envelope download. The recipient
**Open** page is still pending, so save the link for the next phase.

New links use `/open#<encrypted-seed>` (87 fragment characters) by default.
Enable **Include recipient public key in link** to use
`/open#<recipient-public-key>.<encrypted-seed>` (131 fragment characters).
Both fields use canonical unpadded Base64URL (`A-Z`, `a-z`, `0-9`, `-`, `_`);
`.` is an unambiguous separator. Switching formats does not sign, encrypt or upload
again. Envelope download saves the selected fragment as `sealed-seed.txt`.

SDK 0.1.3 encrypts the raw 16-byte seed directly with HPKE. No origins, expiration,
creator descriptor or JSON are embedded. The recipient selects their receiving
identity for links without a public key; the key is still cryptographically bound
to the envelope. Including the public key can help identify the matching identity.
No separate link storage is used. The codec also opens earlier Base32 v2 seeds.

Recipient opening will use the app's configured storage origins. The downloaded
object supplies expiration and its creator key: its signature can be checked, but
the link no longer pins an expected creator. Sender identity remains unverified.
The original full sender reference is still used for recovery and deletion.

Pending or uncertain uploads stay on Send: use **Check upload status**. Only an
authoritative not-found result enables retrying the exact encrypted message, without
another signature. Export the sender reference before leaving the page; it contains
the storage location and is needed for later recovery/deletion. No reference is
saved automatically. The sender retains access and is the default deletion manager.

A browser app for encrypted message exchange using `@zkbytes/sdk`.

The MVP includes the React shell, Terminal/Cyberpunk/Cosmic themes, configuration
validation, MetaMask Connect, WalletConnect through Reown AppKit and a development
fixture wallet. All integrations use the SDK's two-signature compatibility check.
Receiving identities, public cards, encrypted upload, sealed links and same-session
upload recovery are implemented. Opening, imported-reference recovery and deletion
remain unavailable. Live storage/CORS acceptance remains separate from local tests.

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
private keys are never persisted by the app. The app stores only the selected theme;
MetaMask Connect and Reown may store their own connection/session metadata. Their analytics are
disabled. The Send page contains a local draft field; navigation away or a wallet
account change/disconnect clears it.

## Check MetaMask

1. Open My keys and click MetaMask. Approve connection in your extension.
2. If shown, click Switch to Monad Testnet and approve adding/switching the network.
   Then click Check compatibility and approve the two message signatures.
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
3. Disconnect any active lab wallet, then click WalletConnect. Use the QR code or
   select your mobile wallet. Closing the modal cancels the local connection attempt.
4. Run Check compatibility and approve both signatures on the connected wallet.
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
used for compact sealed seeds; the current Open placeholder does not process it.
Real-wallet acceptance is manual; mocked provider tests cover signing requests,
account changes, disconnects, stale results and provider errors. Storage acceptance
remains for later phases.
