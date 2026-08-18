# BUILD 001-F8 Evidence

The focused PGlite boundary test proves:

- baseline shared-trigger failure for all three affected tables;
- successful same-tenant inserts with derived ownership after F8;
- wrong-owner rejection;
- immutable media asset reference and owner;
- immutable image evidence receipt reference and owner;
- immutable preservation run and candidate references and owner.

The test loads the repository migrations in order and uses a disposable local
database. The production candidate remains unchanged apart from the F8
migration, focused test, and these documents.
