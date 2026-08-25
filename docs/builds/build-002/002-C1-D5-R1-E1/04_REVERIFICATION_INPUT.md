# Reverification Input

R1 product SHA: `8cfdabe7fb962c5cd3625faa43231f0066c17b81`

R0 SHA: `a5a72e569e9412774f76fc7ccbcf4a922dcb1a87`

Main SHA: `51e283c3a830d444170a589a6ba7ad6a837607ed`

Run the E1 native harness on a disposable PostgreSQL 17 CI runner, then
classify every required gate exactly as observed. E1 must not start an
independent verifier or merge D5-R1.
