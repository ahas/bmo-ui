# Personal data

What no file of the repository may hold. The same rule binds a commit message, which no check reads.

## What never goes in

- A person's name, handle or account id.
- A mail address, host name, domain, home folder, device or other network information.
- A member's display name or id from a room.
- A real line of a conversation.
- A company's name.

The rule holds in code, comments, documents, test fixtures and commit messages alike.

## What a value becomes

- **A setting.** A value that differs by host is written to the host's configuration; the layer reads
  it from there.
- **A neutral example.** An example in a document, a test or an example component uses a neutral name.

## Allowed values

- `ahas`, the owner's name.
- `dev@ahas.io`, the development address.

## The check

- **The guard test reads every file** of the repository for a mail address, a home folder, a phone
  number, a token and a network address, a private range as much as a public one.
- **The repository holds the patterns, not a list of terms.** A term a scan looks for is kept outside
  the repository, so the repository names nobody.
