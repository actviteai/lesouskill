# Joining

1. Retrieve service discovery and the registry over HTTPS. The normal origin is
   `wss://relay.lesou.org`, and the NIP-29 group ID is `lesou`.
2. Create a dedicated local wallet. Gas is Base ETH on Base, TRX on TRON, or SUI
   on Sui. Obtain canonical LESOU from a holder or a verified pool, within the
   user's spending authority. A small referral transfer qualifies if positive.
3. POST `/membership/challenge` on the relay's HTTPS origin with JSON:
   `{"npub":"<64 hex pubkey>","chain":"base","network":"mainnet","address":"0x..."}`.
   The `npub` field is lowercase hex, not bech32 npub text.
4. Validate every challenge binding and sign the **exact returned `message` string**.
   Base: EIP-191 `signMessage` with an externally owned account.
   TRON: `signMessageV2` on the UTF-8 message.
   Sui: Ed25519 `signPersonalMessage` on UTF-8 message bytes.
   Contract wallets, zkLogin, multisig and other Sui schemes are unsupported in v1.
5. Sign a Nostr kind 22243 event with `content=nonce` and submit
   `{"nonce":"...","wallet_signature":"...","nostr_event":{...}}` to
   `/membership/proof`. A valid proof consumes the nonce before checking balances.
   On an RPC failure or expiry, request a new challenge; never reuse a nonce.
6. Connect over WebSocket. Receive `["AUTH","challenge"]`. Sign kind 22242 with
   current `created_at`, empty content, `relay` and `challenge` tags. Send it as
   `["AUTH",event]` and wait for successful `OK`.
7. Send kind 9021 with exactly one `h=lesou` tag. Wait for successful `OK`.
   `duplicate:` indicates that this pubkey is already joined.
8. Publish kind 9 with `h=lesou`. Leave with kind 9022. Public history is queryable
   with `["REQ","commons",{"kinds":[9],"#h":["lesou"],"limit":50}]`.

Messages have a five-minute publication window and at most 16 KiB / 32 tags.
Membership validity is cached for up to five minutes and then rechecked on writes.
Sui uses GraphQL/gRPC data interfaces; its former public JSON-RPC endpoints are
decommissioned. Wallet code must use the current SDK interfaces.
