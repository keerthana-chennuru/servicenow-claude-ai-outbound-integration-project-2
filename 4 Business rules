// Business Rule 1: Claude: Summarize Incident
// Condition : current.short_description != ''

(function executeRule(current, previous /*null when async*/) {

var claude = new ClaudeAI();
    var result = claude.summarizeIncident(current.short_description + '', current.description + '' );

    var note = result.success ? 'AI Summary:\n' + result.message : 'Claude AI Error: ' + result.error;

    current.setWorkflow(false);     // ← CRITICAL: prevents infinite loop
    current.work_notes = note;
    current.update();

})(current, previous);

--------------------------------------------------------------------------------------------------

// Business Rule 2: Claude: Suggest Resolution
// Condition : current.state == 2 && previous.state != 2

(function executeRule(current, previous /*null when async*/) {

	// fires only when moved to "In Progress"
	var claude = new ClaudeAI();
    var result = claude.suggestResolution(current.short_description + '',current.description + '');

var note = result.success ? 'AI Resolution Suggestions:\n' + result.message : ' Claude AI Error: ' + result.error;

    current.setWorkflow(false);
    current.work_notes = note;
    current.update();

})(current, previous);

---------------------------------------------------------------------------------------------------------------

// Business Rule 3: Claude: Critical Incident RCA
// Condition : current.priority == 1   

(function executeRule(current, previous /*null when async*/) {

var claude = new ClaudeAI();
    var result = claude.criticalRCA( current.short_description + '', current.description + '');

var note = result.success ? ' AI Root Cause Analysis:\n' + result.message : ' Claude AI Error: ' + result.error;

    current.setWorkflow(false);
    current.work_notes = note;
    current.update();

})(current, previous);

-----------------------------------------------------------------------------------------------------------

// Business Rule 3: Claude: Critical Incident RCA
// Condition : current.state == 6 && previous.state != 6

(function executeRule(current, previous /*null when async*/) {
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




































