# 🤖 ServiceNow + Claude AI — Outbound REST Integration

## Project 2: Claude AI Powered Incident Management in ServiceNow

![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&pause=1000&color=6A9FBF&width=600&lines=ServiceNow+%2B+Claude+AI+Integration;Outbound+REST+Integration;AI-Powered+Incident+Management)

---

## 📌 Overview

Built a full **ServiceNow ↔ Claude AI integration** using Outbound REST and a reusable Script Include. The integration automatically summarizes incidents, suggests resolutions, performs root cause analysis, and generates Knowledge Base article drafts — all triggered by Business Rules on the Incident table.

---

## 🎯 Objectives

- ✅ Securely store the Anthropic API key using a Private System Property
- ✅ Build a reusable `ClaudeAI` Script Include with all API logic centralized
- ✅ Create 4 Business Rules that auto-trigger AI responses on Incident events
- ✅ Auto-populate Work Notes with AI summary, resolution steps, and RCA
- ✅ Auto-generate KB Article drafts when an incident is resolved
- ✅ Validate the integration end-to-end with live incident records

---

## 🏗️ Integration Architecture

| Component | What It Is | Role |
|---|---|---|
| API Key | Anthropic authentication key | Authenticates ServiceNow to Claude API |
| System Property | Secure key storage in ServiceNow | Keeps API key safe, never hardcoded |
| Script Include (`ClaudeAI`) | Reusable JavaScript class | Brain — all Claude API logic lives here |
| Business Rules (x4) | Fire on Incident events | Auto-summarize, suggest resolution, RCA, generate KB articles |

---

## 🔄 Integration Flow

```
Incident Event (Create / Update / Resolve)
        ↓
Business Rule fires (After)
        ↓
Calls ClaudeAI Script Include method
        ↓
Script Include → Outbound REST Call
        ↓
https://api.anthropic.com/v1/messages
        ↓
Claude AI processes & responds
        ↓
Response written to Work Notes / KB Article ✅
```

---

## 📋 Step-by-Step Implementation

### Step 1 — Get Your Claude API Key

1. Go to [https://platform.claude.com](https://platform.claude.com)
2. Sign up or log in
3. Navigate to **API Keys** in the left sidebar
4. Click **Create Key** — name it: `ServiceNow-Integration`
5. Copy the key immediately *(shown ONLY ONCE)* — starts with: `sk-ant-api03-...`

> ⚠️ **WARNING:** Never share your API key publicly or hardcode it in scripts.

---

### Step 2 — Store API Key in ServiceNow (System Property)

**Path:** System Definition > System Properties → New *(or navigate to: `sys_properties_list.do`)*

| Field | Value |
|---|---|
| Name | `anthropic.api.key` |
| Value | `sk-ant-api03-xxxxxxxxxxxx` *(your actual key)* |
| Description | Claude AI API Key for ServiceNow Integration |
| Type | string |
| Private | ✅ CHECK THIS — hides value from plain-text view |

> 💡 Marking the property as **Private** means even admins cannot read the value in plain text from the UI. This is best practice for storing secrets.

---

### Step 3 — Create Script Include (ClaudeAI)

**Path:** System Definition > Script Includes → New

| Field | Value |
|---|---|
| Name | `ClaudeAI` |
| API Name | `ClaudeAI` |
| Active | ✅ Checked |
| Client callable | ❌ Unchecked |
| Description | Script Include to call Claude AI API from ServiceNow |

```javascript
var ClaudeAI = Class.create();
ClaudeAI.prototype = {
    initialize: function() {
        this.apiKey = gs.getProperty('anthropic.api.key');
        this.apiUrl = 'https://api.anthropic.com/v1/messages';
        this.model  = 'claude-sonnet-4-5';
    },

    // ── Private: core REST call ──────────────────────────────────────
    _call: function(systemPrompt, userMessage, maxTokens) {
        try {
            var r = new sn_ws.RESTMessageV2();
            r.setEndpoint(this.apiUrl);
            r.setHttpMethod('POST');
            r.setRequestHeader('x-api-key',         this.apiKey);
            r.setRequestHeader('anthropic-version', '2023-06-01');
            r.setRequestHeader('content-type',      'application/json');
            r.setHttpTimeout(30000);

            var body = {
                model:      this.model,
                max_tokens: maxTokens || 1024,
                messages: [{ role: 'user', content: userMessage }],
                system: systemPrompt
            };
            r.setRequestBody(JSON.stringify(body));

            var resp   = r.execute();
            var status = resp.getStatusCode();
            var raw    = resp.getBody();

            if (status !== 200) {
                gs.error('ClaudeAI HTTP ' + status + ': ' + raw);
                return { success: false, error: 'HTTP ' + status };
            }

            var parsed = JSON.parse(raw);
            var text   = parsed.content && parsed.content[0] && parsed.content[0].text
                         ? parsed.content[0].text : '';
            return { success: true, message: text };

        } catch (e) {
            gs.error('ClaudeAI exception: ' + e.message);
            return { success: false, error: e.message };
        }
    },

    // ── Public: summarize incident ───────────────────────────────────
    summarizeIncident: function(shortDesc, description) {
        var system = 'You are an IT support analyst. Summarize this incident in 3-4 sentences. Be concise and technical.';
        var user   = 'Incident: ' + shortDesc + '\n\nDetails:\n' + description;
        return this._call(system, user, 512);
    },

    // ── Public: suggest resolution ───────────────────────────────────
    suggestResolution: function(shortDesc, description) {
        var system = 'You are a senior IT support engineer. Provide exactly 3 numbered resolution steps for this incident. Be specific and actionable.';
        var user   = 'Incident: ' + shortDesc + '\n\nDetails:\n' + description;
        return this._call(system, user, 1024);
    },

    // ── Public: root cause analysis ──────────────────────────────────
    criticalRCA: function(shortDesc, description) {
        var system = [
            'You are an ITSM root cause analysis expert.',
            'Structure your response with these sections:',
            '1. Root Cause',
            '2. Immediate Actions',
            '3. Long-term Fix',
            '4. Escalation Recommendation',
            'Be concise and technical.'
        ].join('\n');
        var user = 'Critical Incident: ' + shortDesc + '\n\nDetails:\n' + description;
        return this._call(system, user, 2048);
    },

    // ── Public: generate KB article ──────────────────────────────────
    generateKBArticle: function(shortDesc, description, resolutionNotes) {
        var system = [
            'You are a technical writer for an IT Knowledge Base.',
            'Generate a KB article in this exact format:',
            '## Summary',
            '## Symptoms',
            '## Root Cause',
            '## Resolution Steps',
            '## Prevention',
            'Use clear, simple language suitable for L1 support.'
        ].join('\n');
        var user = [
            'Incident: '             + shortDesc,
            '\nDescription:\n'       + description,
            '\nResolution Notes:\n'  + (resolutionNotes || 'Not provided')
        ].join('');
        return this._call(system, user, 4096);
    },

    type: 'ClaudeAI'
};
```

> 💡 **KEY POINT:** This Script Include is written **once**. All 4 Business Rules simply call `new ClaudeAI()` and invoke the relevant method — no duplicated API logic.

---

### Step 4 — Business Rules Overview

**Path:** System Definition > Business Rules → New

| BR # | Name | Table | When | Trigger | Condition | Method Called |
|---|---|---|---|---|---|---|
| 1 | Claude - Summarize Incident | incident | after | Insert | `current.short_description != ''` | `summarizeIncident()` |
| 2 | Claude - Suggest Resolution | incident | after | Update | `current.state == 2 && previous.state != 2` | `suggestResolution()` |
| 3 | Claude - Critical Incident RCA | incident | after | Insert + Update | `current.priority == 1` | `criticalRCA()` |
| 4 | Claude - Generate KB Article | incident | after | Update | `current.state == 6 && previous.state != 6` | `generateKBArticle()` |

> ⚠️ **CRITICAL:** Always add `current.setWorkflow(false)` before `update()` inside every Business Rule. Without it, updating `work_notes` inside the BR triggers the BR again — causing an **infinite loop**.

---

### Step 5 — Business Rule Scripts

#### BR 1 — Summarize Incident
> **Note:** BR 1 — Claude: Summarize Incident
Table: incident | When: after | Insert: ✅ | Update: ❌
Condition: current.short_description != ''
```
(function executeRule(current, previous /*null when async*/) {

var claude = new ClaudeAI();
    var result = claude.summarizeIncident(current.short_description + '', current.description + '' );

    var note = result.success ? 'AI Summary:\n' + result.message : 'Claude AI Error: ' + result.error;

    current.setWorkflow(false);     // ← CRITICAL: prevents infinite loop
    current.work_notes = note;
    current.update();

})(current, previous);
```
#### BR 2 — Suggest Resolution
> **Note:** BR 2 — Claude: Suggest Resolution
Table: incident | When: after | Insert: ❌ | Update: ✅
Condition: current.state == 2 && previous.state != 2
(fires only when moved to "In Progress")

```
(function executeRule(current, previous /*null when async*/) {

	// fires only when moved to "In Progress"
	var claude = new ClaudeAI();
    var result = claude.suggestResolution(current.short_description + '',current.description + '');

var note = result.success ? 'AI Resolution Suggestions:\n' + result.message : ' Claude AI Error: ' + result.error;

    current.setWorkflow(false);
    current.work_notes = note;
    current.update();

})(current, previous);
```

#### BR 3 — Critical Incident RCA
> **Note:**  BR 3 — Claude: Critical Incident RCA
Table: incident | When: after | Insert: ✅ | Update: ✅
Condition: current.priority == 1 (for P1 critical Inc's only)

```
(function executeRule(current, previous /*null when async*/) {

var claude = new ClaudeAI();
    var result = claude.criticalRCA( current.short_description + '', current.description + '');

var note = result.success ? ' AI Root Cause Analysis:\n' + result.message : ' Claude AI Error: ' + result.error;

    current.setWorkflow(false);
    current.work_notes = note;
    current.update();

})(current, previous);
```
#### BR 4 — Generate KB Article
> **Note:** BR 4 — Claude: Generate KB Article
Table: incident | When: after | Update: ✅
Condition: current.state == 6 && previous.state != 6
(fires only when moved to "Resolved")

```(function executeRule(current, previous /*null when async*/) {
var claude = new ClaudeAI();
   
    var result = claude.generateKBArticle(current.short_description + '', current.description + '', current.close_notes + '');
	
    if (!result.success) {
        gs.warn('ClaudeAI KB generation failed: ' + result.error);
        return;
    }

    // Create KB article automatically
    var kb = new GlideRecord('kb_knowledge');
    kb.initialize();
    kb.setValue('short_description', 'AI Generated: ' + current.short_description);
    kb.setValue('text',              result.message);
    kb.setValue('kb_knowledge_base', '<YOUR_KB_SYS_ID>');  // ← replace this
    kb.setValue('workflow_state',    'draft');               // stays draft for human review
    var kbSysId = kb.insert();

    current.setWorkflow(false);
    current.work_notes = 'KB Article draft created (sys_id: ' + kbSysId + ')';
    current.update();

})(current, previous);
```
---

### Step 6 — Testing the Integration

| # | Action |
|---|---|
| 1 | Create a new Incident — Work Notes should auto-populate with AI Summary |
| 2 | Move Incident state to **In Progress** — Work Notes should show Resolution Suggestions |
| 3 | Set Incident Priority to **P1** — Work Notes should show RCA |
| 4 | Move Incident state to **Resolved** — KB Article draft should be auto-created |

**What to Check After Testing:**
- System Logs > Application — no errors logged
- Transaction Logs — shows outbound call to `api.anthropic.com`
- Work Notes on incident auto-populated with AI response
- KB Article visible at `kb_knowledge.list` with prefix `AI Generated:`

---

## ⚙️ Technical Details

| Component | Detail |
|---|---|
| Model | `claude-sonnet-4-5` |
| API Endpoint | `https://api.anthropic.com/v1/messages` |
| Anthropic API Version | `2023-06-01` |
| Max Tokens | 512 (summary) / 1024 (resolution) / 2048 (RCA) / 4096 (KB article) |
| Timeout | 30,000 ms |
| Key Storage | Private System Property (`anthropic.api.key`) |
| Script Include | `ClaudeAI` — Global scope, server-side only |

---

## ✅ Skills Demonstrated

- 🧠 Reusable Script Include design (`ClaudeAI` class with `_call()` private method)
- ⚡ 4 After Business Rule triggers on Insert, Update, and State changes
- 🔐 Secure API key storage using Private System Properties
- 📝 Work Notes auto-population on every incident event
- 📚 KB Article auto-creation on incident resolve
- 🧪 End-to-end integration testing with live incident records

---

## ⚠️ Common Mistakes to Avoid

| ❌ Mistake | ✅ Best Practice |
|---|---|
| Hardcoding the API key in scripts | Always store in a Private System Property |
| Missing `setWorkflow(false)` in Business Rules | Prevents infinite loop when updating `work_notes` |
| Using wrong model name | Use `claude-sonnet-4-5` — not `claude-sonnet-4-20250514` |
| Empty method stubs in Script Include | All 4 methods must be fully implemented |
| Duplicate API logic in each Business Rule | Centralize all logic in the `ClaudeAI` Script Include |

---

## 🔧 Troubleshooting

| Error / Symptom | Likely Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Wrong or expired API key | Re-check `anthropic.api.key` system property |
| `HTTP 404 not_found_error` | Wrong model name | Change model to `claude-sonnet-4-5` |
| `HTTP 400 Bad Request` | Wrong request body format | Check JSON structure in Script Include |
| No work notes added | BR not firing or condition not met | Check BR conditions and System Logs |
| Infinite loop / stack overflow | Missing `setWorkflow(false)` | Add `current.setWorkflow(false)` before `update()` |
| null or empty response | Claude returned empty content | Add logging: `gs.info(JSON.stringify(result))` |
| Connection timeout | Firewall blocking Claude API | Check ServiceNow outbound firewall rules |
| BR fires but no KB created | Wrong KB `sys_id` | Replace `<YOUR_KB_SYS_ID>` with actual Knowledge Base sys_id |

---

## 💡 Key Learning

> The `ClaudeAI` Script Include acts as a **single source of truth** for all AI logic. Business Rules stay clean and minimal — they simply instantiate `new ClaudeAI()` and call the right method. This pattern makes the integration easy to maintain, extend, and debug.

---

<div align="center">

Made with ❤️ by **Keerthana Chennuru**

</div>
