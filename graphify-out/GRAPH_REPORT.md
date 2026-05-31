# Graph Report - Llama-AI  (2026-05-31)

## Corpus Check
- 62 files · ~1,419,315 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1433 nodes · 3692 edges · 118 communities (73 shown, 45 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 617 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9db0603f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]

## God Nodes (most connected - your core abstractions)
1. `push()` - 88 edges
2. `i()` - 72 edges
3. `ac()` - 63 edges
4. `slice()` - 57 edges
5. `r()` - 46 edges
6. `n()` - 41 edges
7. `bc()` - 37 edges
8. `t()` - 36 edges
9. `lc()` - 36 edges
10. `D()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `ModelEndpoint` --uses--> `ModelEndpoint`  [INFERRED]
  backend/orchestrator/registry.py → backend/orchestrator/models.py
- `str` --uses--> `ModelEndpoint`  [INFERRED]
  backend/orchestrator/registry.py → backend/orchestrator/models.py
- `ModelEndpoint` --uses--> `ModelRegistry`  [INFERRED]
  backend/orchestrator/models.py → backend/orchestrator/registry.py
- `_stream_chat()` --calls--> `encode_json_event()`  [EXTRACTED]
  backend/orchestrator/api.py → backend/orchestrator/streaming.py
- `generate_image()` --calls--> `ProviderError`  [EXTRACTED]
  backend/orchestrator/api.py → backend/orchestrator/providers/huggingface.py

## Import Cycles
- None detected.

## Communities (118 total, 45 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (4): clearAllCookies(), clearCookies(), dr(), ur()

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (54): Any, bool, str, str, Any, int, ModelEndpoint, Response (+46 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (53): AIModel, authListeners, AuthUser, BACKEND_API_KEY, BACKEND_BASE_URL, BackendQueryFilter, BackendQueryOrder, BackendQueryPayload (+45 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (28): ap(), C(), Ct(), D(), da(), dn(), Dt(), ef() (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (60): af(), an(), At(), Bd(), bf(), Bt(), cd(), cf() (+52 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (18): Ba(), Bp(), cp(), delete(), Dp(), ep(), hp(), ip() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (34): Au(), bu(), Cu(), Du(), eo(), fd(), Fu(), gi() (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (59): _(), as(), bs(), cs(), Do(), ds(), Ec(), es() (+51 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (46): Any, str, Any, str, Any, Response, str, BaseModel (+38 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (44): App, conversations_share_token_key, messages_branch_id_non_negative, messages_feedback_valid, messages_model_check, README.md, index.html, public/service-worker.js (+36 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (42): Application Entry, Architecture and Responsibilities, Architecture Diagram (Logical), Authentication, Branching and Variants, Branching Logic Flow (Text + Image), Chat Rendering Pipeline, Complete App Working Flow (+34 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (31): Backend Python Requirements, PyPDF2, aiofiles, beautifulsoup4, faker, fastapi, flask, httpx (+23 more)

### Community 12 - "Community 12"
Cohesion: 0.05
Nodes (137): ac(), ai(), al(), basename(), bc(), Bi(), bl(), bo() (+129 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (8): bool, int, str, ModelEndpoint, str, HealthStatus, ModelEndpoint, ModelRegistry

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (14): a(), bh(), Ca(), gm(), gy(), hg(), kv(), qm() (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (22): b(), dd(), dm(), E(), er(), Fr(), gd(), hn() (+14 more)

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (24): Dark background, Llama AI logo (color llama head), Llama AI wordmark text, White background, Splash (land night xxhdpi): dark background with llama logo on white square, Splash (land night xxxhdpi): dark background with llama logo on white square, Splash (land xhdpi): white background with llama logo and Llama AI text (partially cropped), Splash (land xxhdpi): white background with llama logo and Llama AI text (+16 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (23): ab(), bb(), cb(), db(), eb(), fb(), gb(), hb() (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (6): BackendQueryBuilder, isSessionExpiring(), loadStoredSession(), refreshStoredSession(), saveStoredSession(), toErrorMessage()

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (21): dependencies, @capacitor/app, @capacitor/browser, @capacitor/core, @capacitor/keyboard, @capacitor/splash-screen, @capacitor/status-bar, highlight.js (+13 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (17): eq(), fp(), ilike(), mm(), not(), notifyListeners(), og(), order() (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (18): appId, appName, resize, style, plugins, Keyboard, SplashScreen, StatusBar (+10 more)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (11): cn(), en(), fn(), hd(), In(), nn(), on(), qt() (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (19): Android App Module, Android Buildscript, Capacitor Android Build, Capacitor Settings Includes, Android Settings, Android SDK Versions, Capacitor Android Module, Capacitor App Module (+11 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (18): HuggingFaceProvider, ProviderError, SSEEvent, backend/orchestrator/providers/huggingface.py, backend/orchestrator/streaming.py, encode_json_event, encode_sse, extract_token (+10 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (17): Android Scheme https, Capacitor App Config, App ID com.llama.ai, App Name Llama AI, AppPlugin classpath, BrowserPlugin classpath, Keyboard Plugin Config, KeyboardPlugin classpath (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (16): ic_launcher_foreground (hdpi), ic_launcher_round (hdpi), ic_launcher (ldpi), ic_launcher_foreground (ldpi), ic_launcher_round (ldpi), ic_launcher (mdpi), ic_launcher_foreground (mdpi), ic_launcher_round (mdpi) (+8 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (16): devDependencies, @capacitor/android, @capacitor/cli, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+8 more)

### Community 31 - "Community 31"
Cohesion: 0.21
Nodes (11): cleanup_temp_files(), CodeRequest, get_commands(), is_safe(), java_public_class_name(), normalize_language(), bool, str (+3 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (14): Android launcher foreground icon, Android launcher round icon, Web app icon 128, Web app icon 192, Web app icon 256, Web app icon 48, Web app icon 512, Web app icon 72 (+6 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (15): add(), by(), cg(), jh(), kg(), km(), ny(), onAuthStateChange() (+7 more)

### Community 34 - "Community 34"
Cohesion: 0.53
Nodes (6): Ge(), Ln(), me(), mn(), pe(), pn()

### Community 35 - "Community 35"
Cohesion: 0.50
Nodes (4): am(), nm(), om(), rm()

### Community 36 - "Community 36"
Cohesion: 0.27
Nodes (10): app.py, orchestrator api.py, orchestrator auth_api.py, orchestrator config.py, orchestrator data_api.py, orchestrator health.py, orchestrator models.py, orchestrator registry.py (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (9): Vite React Plugin, TS App Compiler Options, TS Node Compiler Options, TypeScript Project References, Vite Build Config, tsconfig.app.json, tsconfig.json, tsconfig.node.json (+1 more)

### Community 38 - "Community 38"
Cohesion: 0.22
Nodes (9): scripts, build, cap:android, cap:open, cap:run, cap:sync, dev, lint (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.25
Nodes (8): Splash Image Landscape HDPI, Splash Image Landscape LDPI, Splash Image Landscape MDPI, Splash Image Landscape Night HDPI, Splash Image Landscape Night LDPI, Splash Image Landscape Night MDPI, Splash Image Landscape Night XHDPI, Splash Image

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (8): getMessageModel(), getPromptSignatureValue(), inferAssistantModelFromThread(), isAIModel(), parseMessageContent(), resolveImageFromPromptSignature(), toDataUrlFromBase64(), tryParseMessagePayload()

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (7): backend/orchestrator/supabase_client.py, auth_request, build_filter_params, build_order_param, create_pkce_pair, fetch_user, postgrest_request

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (6): cr(), gr(), sr(), transform(), vr(), yn()

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (6): ic_launcher_background (ldpi), ic_launcher_background (mdpi), ic_launcher_background (xhdpi), ic_launcher_background (xxhdpi), ic_launcher_background (xxxhdpi), Launcher background

### Community 44 - "Community 44"
Cohesion: 0.14
Nodes (14): Be(), Ce(), de(), ee(), g(), he(), hm(), Np() (+6 more)

### Community 45 - "Community 45"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 46 - "Community 46"
Cohesion: 0.29
Nodes (8): autoWrapMathDelimiters(), ChatWorkspace(), cleanAssistantOutput(), getBranchPreferenceContentKey(), getImageVariantContentKey(), hashCodeBlockKey(), normalizeLatexDelimiters(), prepareMarkdownForRender()

### Community 47 - "Community 47"
Cohesion: 0.40
Nodes (5): buildBackendHeaders(), generateImageFromPrompt(), requestBackendJson(), streamCompletion(), streamImageCompletion()

### Community 48 - "Community 48"
Cohesion: 0.50
Nodes (4): Copilot Instructions, Graphify Report, Graphify Graph JSON, Graphify Wiki Index

### Community 49 - "Community 49"
Cohesion: 0.50
Nodes (4): Landing/Auth Design Instructions, Frontend Design Skill, App Component, Global Styles

### Community 50 - "Community 50"
Cohesion: 0.50
Nodes (4): index-IOVwAcj5.js, web-4PMXsux9.js, web-DgG2KMUp.js, service-worker.js

### Community 53 - "Community 53"
Cohesion: 0.50
Nodes (4): Dependencies, Dev Dependencies, NPM Scripts, package.json

### Community 55 - "Community 55"
Cohesion: 0.67
Nodes (3): addListener(), addWindowListener(), sendRetainedArgumentsForEvent()

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (3): fail(), info(), message()

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): Aa(), Ao(), Co(), consume(), iv(), ka(), oa(), pop() (+9 more)

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (3): Codex Hooks, graphify hook-check command, .codex/hooks.json

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (5): hasLongWords(), looksLikeMath(), shouldWrapMath(), stripLatexCommands(), wrapMathSegments()

### Community 68 - "Community 68"
Cohesion: 0.67
Nodes (3): hs(), ir(), Lr()

## Knowledge Gaps
- **207 isolated node(s):** `config`, `name`, `private`, `version`, `type` (+202 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `slice()` connect `Community 7` to `Community 0`, `Community 34`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 35`, `Community 42`, `Community 12`, `Community 44`, `Community 15`, `Community 21`, `Community 57`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `i()` (e.g. with `f()` and `Ge()`) actually correct?**
  _`i()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `ac()` (e.g. with `D()` and `di()`) actually correct?**
  _`ac()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `r()` (e.g. with `de()` and `Ec()`) actually correct?**
  _`r()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `name`, `private` to the rest of the system?**
  _208 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01769641495041953 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.051201671891327065 - nodes in this community are weakly interconnected._