# Link preflight

LeSou Link is voluntary HTLC settlement, not a mint/burn bridge. Check deployed
registry identifiers and contract state independently. Never trust offer text alone.

- One secret is exactly **32 raw bytes**. Hash with SHA-256. A hex string is only
  transport encoding; do not hash its 64 ASCII characters.
- Test vector: `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f`
  hashes to `630dcd2966c4336691125448bbb25b4ff412a49c732db2c8abc1b8581bd710dd`.
- A remote AssetID digest is SHA-256 of UTF-8 `chain:network:identifier`, using
  the exact canonical registry spelling.
- v1 requires a named taker; there is no unrestricted claim path. The maker may
  recover only their unclaimed escrow after expiry. Offers cannot be reused.
- Base/TRON deadlines use Unix seconds. Sui uses Unix milliseconds.
- Give the first escrow a later expiry than the second. Allow enough margin for
  chain finality, downtime and claiming the first escrow after the second reveals
  its secret. Equal deadlines are unsafe.
- Verify the funded amounts, token/coin type, recipients, hashlocks, and deadlines
  on **both** chains before revealing the secret. Escrows cannot verify remote
  funding. The secret becomes public upon claim.

Report deployment/audit status accurately. Never describe local tests as an audit
or promise that sister assets exchange at parity.
