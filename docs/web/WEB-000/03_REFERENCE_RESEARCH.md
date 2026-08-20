# Reference Research

All references were observed on 2026-08-20 from their current public homepages. These are pattern studies, not licenses to copy composition, source code, artwork, copy, color systems, or motion.

## Primary references

| Reference | Specific observed pattern | Why it works | Virro translation | Copy risk | Visual-copy risk |
| --- | --- | --- | --- | --- | --- |
| [Linear](https://linear.app/) | Dark technical-document surface, FIG labels, real product states, product UI as narrative, humans and agents in the same workflow | Product evidence appears before abstract claims | Turn Virro's own readiness/state model into the page grammar; use real-looking but explicitly conceptual state records | High: “system for teams and agents” is adjacent | High: do not copy violet, page sequence, faux-window geometry, or FIG composition |
| [Vercel](https://vercel.com/) | Very short category headline, one strong geometric hero, platform divided into large primitives | A broad platform becomes understandable through hierarchy and recurring geometry | Treat assurance as infrastructure and organize by state primitives | Medium: “infrastructure” alone is too broad | High: avoid black/white triangle, grid, and Vercel-like monochrome minimalism |
| [WorkOS](https://workos.com/) | Outcome-state headline (“Enterprise Ready”), bright whitespace, direct developer explanation | The desired state is legible in seconds | Use explicit state language such as READY, STALE, NEEDS_CONTEXT; pair it with mechanism | High: “Ready” can sound copied or overpromise | Medium: avoid the same split-color headline and airy enterprise template |
| [LaunchDarkly](https://launchdarkly.com/) | “Move fast / stay in control” contrast, control-layer category, high-contrast acid accent | Frames velocity and governance as one product tension | Frame AI delegation speed and intent control as a single assurance problem | High: “control layer” is their territory | Medium: acid accent may inform emphasis but not composition |
| [Temporal](https://temporal.io/) | Reliability framed as durable execution; state over time is explained through workflow primitives | Makes infrastructure value concrete through failure/recovery behavior | Explain currentness and stale propagation as temporal properties of work | Medium: do not borrow “durable execution” as category | Medium: avoid its purple grid/space-like field; Virro is not outer space |
| [Sentry](https://sentry.io/welcome/) | Product-as-demo CTA (“See how in Sandbox”), connected signals, opinionated brand voice | Visitors can experience deterministic product behavior before signup | Build a deterministic WorkState showroom with controlled scenarios | Medium: avoid jokey monitoring language | Medium: do not copy purple illustration/noise or sandbox layout |
| [Stripe](https://stripe.com/) | Category-defining headline, modular product story, localized copy, evidence and customer proof placed confidently | Broad capabilities stay commercially legible | Use a precise category statement, then prove mechanics module by module | High: quantified proof must not be imitated without Virro evidence | High: avoid gradient ribbon, dense mega-nav, and Stripe section rhythm |
| [Raycast](https://www.raycast.com/) | One physical metaphor and a restrained first viewport carry the brand | A single memorable object creates ownership | Let the WorkState Field be Virro's recognizable metaphor across hero and modules | Medium: “shortcut” simplicity should not flatten assurance | High: do not imitate floating command surface, keyboard, or red glow |

## Supporting references

| Reference | Specific observed pattern | Virro lesson | Risk |
| --- | --- | --- | --- |
| [Datadog](https://www.datadoghq.com/) | Large platform breadth, product taxonomy, real dashboard visuals | Keep navigation shallow at launch; show a few assurance primitives instead of every capability | Mega-navigation and catalog density would overwhelm an early category |
| [GitHub](https://github.com/) | Familiar work artifacts and explicit progression from issue to code/review | Use recognizable source/work artifacts only as inputs; Virro remains the binding layer | A code-centric story would exclude nonengineering work |
| [Notion](https://www.notion.com/) | Broad workspace story simplified through direct benefits and approachable visual surfaces | Keep nontechnical explanations alongside the technical state model | “AI workspace” framing would collapse Virro into a crowded category |

## Required lessons

- **Linear lesson:** the real state model can be the marketing visual system. Virro must not copy Linear's violet palette, product-window hero, or page composition.
- **Vercel lesson:** strong hierarchy and repeated primitives make an infrastructure platform understandable. Virro must own bindings/gates rather than generic geometry.
- **WorkOS lesson:** a named target state is powerful when the product mechanism supports it. Virro should make its states explicit and evidence-backed.
- **LaunchDarkly lesson:** control and speed can be one story. Virro should show change, blocking, and authorization instead of claiming generic governance.
- **Temporal lesson:** time and currentness are product properties. Stale propagation should be visible and inspectable.
- **Sentry lesson:** a deterministic showroom can explain a complex product more credibly than a video or chatbot.
- **Stripe lesson:** category clarity and modular product storytelling are valuable; fake quantified proof and visual imitation are not.
- **Raycast lesson:** one proprietary metaphor can carry the brand. Virro's metaphor is the WorkState Field, not a keyboard or command palette.

## Component and interaction research

Observed sources: [Aceternity UI](https://ui.aceternity.com/explore), [Magic UI](https://magicui.design/docs/components), [Motion](https://motion.dev/docs/react-reduce-bundle-size), [Motion Primitives](https://motion-primitives.com/docs), [React Flow](https://reactflow.dev/learn/advanced-use/accessibility), and [Rive](https://rive.app/docs/runtimes/runtime-sizes).

| Candidate | Decision | Evidence and rationale |
| --- | --- | --- |
| Aceternity UI | **REJECT as composition; DEFER isolated primitives** | Registry/source-copy model can accelerate experiments, but its hero backgrounds, beams, glows, grids, and template blocks carry strong visual fingerprints and commonly depend on Motion/Tailwind. No WEB-001 signature module should originate here. |
| Magic UI | **REJECT as composition; DEFER isolated primitives** | The catalog is dominated by animated beams, gradients, particles, globes, marquees, shiny text, and template-like effects. A future primitive may be adapted only after semantic, a11y, reduced-motion, and weight review. |
| Motion | **MODIFY / conditional KEEP** | Official guidance shows `motion` component use can be about 34 kB while `LazyMotion` + `m` can reduce initial features to about 4.6 kB; `useAnimate` mini is about 2.3 kB. Use one pinned dependency only if CSS/WAAPI is insufficient. |
| Motion Primitives | **DEFER** | Reusable source is customizable, but it is built around Motion and Tailwind and its visible components are not Virro-specific. Treat it as reference code, not a design system. |
| React Flow | **DEFER, likely REJECT for homepage** | It supports SSR and keyboard/screen-reader behavior, but its editor/canvas interaction model is more capability than the fixed WorkState demonstrations require. Revisit only for a later exploratory graph product surface. |
| Rive | **REJECT for WEB-001** | Even `canvas-lite` carries roughly 222 kB compressed WASM before `.riv` assets; canvas content also needs a meaningful text equivalent. The weight and authoring pipeline are unjustified for state diagrams achievable with HTML/CSS/SVG. |

## Research conclusion

The transferable pattern is **product mechanism made visible**, not the current dark-AI aesthetic. Virro should use custom semantic HTML, CSS, and restrained SVG lines; the recognizable content must be readiness, provenance, dependencies, gates, evidence, and staleness.
