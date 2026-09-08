# Relay operations and waiting list

One masternode has one public relay endpoint and one unique relay identity.
Registrations bind the operator and relay keys with separate signatures. Initial
collateral is zero. A future nonzero requirement needs a verified collateral adapter.

Inspect `https://relay.lesou.org/por/status`. ACTIVE requires two fresh passing
observations out of the three configured verifiers. Verifiers test TLS, NIP-11,
fresh signed relay challenges, NIP-42, unauthenticated rejection, canary publish
and retrieval, and signed NIP-29 metadata. Proofs expire; stale state is ineligible.

IPv4 NAT, direct IPv4 and IPv6 are endpoint deployment options. Reachability is
evaluated externally. The initial deployment uses outbound Cloudflare tunnels.

Chuck operates the three initial nodes. Observations are operational measurements
from one operator's infrastructure; they are not trustless consensus. No reward
payments or reward controller are implemented.

To join the waiting list, publish a signed kind 9 CAP_REQ with `h=lesou`, `t=lep`,
and `t=lesou-masternode-waitlist`. Body fields: `service: "masternode-waitlist"`,
`network_modes`, and a **public** `contact`. Requests require Commons membership
and remain public in relay history. Do not include private server credentials.
A waiting-list request is neither admission as a node nor a reward promise.
