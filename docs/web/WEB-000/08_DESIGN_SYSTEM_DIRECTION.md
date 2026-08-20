# Design System Direction

## Design principles

1. State before decoration.
2. Evidence before assertion.
3. One dominant mechanism per viewport.
4. Motion communicates transitions; it never supplies meaning by itself.
5. Mobile receives a native information form, not a scaled desktop canvas.
6. Third-party primitives may support behavior but never define Virro's signature.

## Token direction

### Color roles

```text
canvas/default       #0B0D0F
canvas/raised        #12161A
paper/default        #F3F1EA
ink/on-dark          #F2F4EF
ink/on-light         #171A18
ink/muted-dark       #939C98
ink/muted-light      #656B67
line/dark            #2A3133
line/light           #D4D2C9
signal/new           #77D7D1
authority/conditional#D7B56D
state/committed      #A99BEF
state/stale          #C97C63
state/policy         #8996A5
focus                #8EDDF5
```

Final values require contrast verification against every surface. State meaning always includes label and shape/line pattern.

### Typography

```text
display-xl  clamp(3.25rem, 7vw, 7rem) / 0.94
display-lg  clamp(2.4rem, 5vw, 4.8rem) / 1.00
heading-2   clamp(1.9rem, 3vw, 3.1rem) / 1.08
heading-3   1.125rem / 1.25
body-lg     clamp(1.05rem, 1.5vw, 1.25rem) / 1.55
body        1rem / 1.6
meta        0.75rem / 1.4, uppercase/mono only where semantic
```

Use system sans + system mono in the first implementation. A later self-hosted typeface must remain optional and measured.

### Spacing and grid

- Base unit: 4px.
- Primary rhythm: 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Desktop content max: 1200px; reading measure: 720px.
- Desktop grid: 12 columns; tablet: 8; mobile: 4.
- Section padding: 96–144px desktop, 64–88px tablet, 48–72px mobile.

### Radius, border, elevation

- Radius: 4px for chips, 8px for controls, 12px for state surfaces, 20px maximum for major containers.
- Borders carry most hierarchy: 1px default; 2px active gate; never pervasive glow.
- Elevation: low-opacity shadow + border only for overlays/inspection panels.
- Field nodes use squared/notched corners more often than generic pills.

### Surface patterns

- Fine coordinate grid: 32px/8px major/minor rhythm at very low contrast.
- Signal rail: 1px solid current; dashed stale; double-line authority; dotted conceptual.
- Version tab: compact mono ID and timestamp, aligned consistently.
- No decorative texture that impairs reading.

## Status chips

| State | Form | Icon/mark | Color role | Required label |
| --- | --- | --- | --- | --- |
| READY | closed rectangle | filled check | signal/new | READY |
| READY_WITH_CONDITIONS | split rectangle | half-check | authority/conditional | full text |
| NEEDS_CONTEXT | open-right bracket | plus | authority/conditional | full text |
| INSUFFICIENT_SIGNAL | open rectangle | empty node | state/policy | full text |
| HUMAN_REVIEW_REQUIRED | double border | person/initial | authority/conditional | full text |
| STALE | offset/double frame | broken link | state/stale | STALE |
| BLOCKED_BY_POLICY | barred rectangle | rule bar | state/policy | full text |
| UNKNOWN | dotted frame | question | ink/muted | UNKNOWN |

## Icon style

Use 1.5px technical line icons with squared terminals and a small vocabulary: signal, binding, version, evidence, human authority, policy, stale, gate. Icons support text and are never decorative shield substitutes.

## Motion vocabulary

| Token | Meaning | Visual behavior | Fallback |
| --- | --- | --- | --- |
| PULSE | new signal | one low-amplitude brightness pulse | static “new” mark |
| FLOW | authorized propagation | short directional trace along one edge | arrow/solid edge update |
| SNAP | state committed | surface aligns and version increments | immediate version/state change |
| DIM | stale/inactive | reduce contrast, preserve label | static muted/dashed form |
| BREAK | dependency invalid | edge separates / becomes dashed | broken-link mark + text |
| LOCK | gate closed | barrier resolves into closed form | blocked chip + reasons |
| RESOLVE | state reconciled | stale nodes return to aligned state | immediate state replacement |
| TRACE | provenance inspection | connected evidence edges highlight | expanded provenance region |

### Durations and easing

```text
instant       0ms
fast          120ms
standard      220ms
state         360ms
sequence-step 480ms maximum
ease-standard cubic-bezier(.2,.8,.2,1)
ease-snap     cubic-bezier(.16,1,.3,1)
```

No perpetual motion at rest. No required interaction exceeds 500ms before the next state is legible.

## Breakpoints

```text
sm  480px
md  720px
lg  960px
xl  1200px
```

Breakpoints describe layout opportunities; modules may switch structure earlier when labels would wrap or connector geometry becomes ambiguous.

## Micro-interactions

Allowed: restrained edge illumination, visible focus trace, state-chip transition, version change, provenance disclosure, short line propagation. A magnetic button is optional only if movement is subtle, keyboard behavior is unchanged, and reduced motion disables it. No custom cursor.
