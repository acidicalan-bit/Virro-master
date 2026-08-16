# BUILD 001-F7-R2.1 - Authoritative command definition binding

## Validated finding

The public local evidence-runner factory accepts a caller-defined command registry. A caller can bind an accepted command ID such as `test:sql` to an unrelated executable and arguments, execute that surrogate successfully, and receive `PROVEN` runner-recorded evidence.

The runner is authoritative for the process it observed, but the criterion is not bound to an authoritative meaning for the command ID. Command labels are therefore caller-rebindable.

## Scope

R2.1 changes only development-assurance command definitions, runner/requirement/receipt binding, focused tests, the generated assurance manifest where required, and this documentation. Application runtime, product evidence, Supabase, F3-F6, and remote E4 remain out of scope.
