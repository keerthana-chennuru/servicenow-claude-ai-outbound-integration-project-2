var ClaudeAI = Class.create();
ClaudeAI.prototype = {


    initialize: function() {
        this.apiKey = gs.getProperty("anthropic.api.key");
    },


    sendMessage: function(userMessage) {
        try {
            var rm = new sn_ws.RESTMessageV2();
            rm.setEndpoint("https://api.anthropic.com/v1/messages");
            rm.setHttpMethod("POST");
            rm.setRequestHeader("Content-Type", "application/json");
            rm.setRequestHeader("anthropic-version", "2023-06-01");
            rm.setRequestHeader("x-api-key", this.apiKey);
            rm.setHttpTimeout(30000);


            var body = JSON.stringify({
                model: "claude-sonnet-4-5",
                max_tokens: 1024,
                messages: [
                    {
                        role: "user",
                        content: userMessage
                    }
                ]
            });


            rm.setRequestBody(body);


            var response     = rm.execute();
            var statusCode   = response.getStatusCode();
            var responseBody = response.getBody();


            if (statusCode == 200) {
                var parsed = JSON.parse(responseBody);
                return {
                    success : true,
                    message : parsed.content[0].text,
                    tokens  : parsed.usage.output_tokens
                };
            } else {
                gs.error("ClaudeAI Error " + statusCode + ": " + responseBody);
                return { success: false, error: "HTTP " + statusCode };
            }
        } catch (ex) {
            gs.error("ClaudeAI Exception: " + ex.message);
            return { success: false, error: ex.message };
        }
    },


    summarizeIncident: function(shortDesc, description) {
        var prompt =
            "You are an IT support assistant.\n" +
            "Summarize this IT incident in 2 clear lines.\n\n" +
            "Short Description: " + shortDesc + "\n" +
            "Description: "       + description;
        return this.sendMessage(prompt);
    },


    suggestResolution: function(shortDesc, description) {
        var prompt =
            "You are an IT support expert.\n" +
            "Suggest 3 clear resolution steps for this incident.\n\n" +
            "Short Description: " + shortDesc + "\n" +
            "Description: "       + description;
        return this.sendMessage(prompt);
    },


    criticalRCA: function(shortDesc, description) {
        var prompt =
            "You are a senior IT incident manager.\n" +
            "This is a CRITICAL Priority 1 incident.\n" +
            "Provide: 1) Likely root cause  2) Immediate actions  3) Escalation recommendation.\n\n" +
            "Short Description: " + shortDesc + "\n" +
            "Description: "       + description;
        return this.sendMessage(prompt);
    },


    generateKBArticle: function(shortDesc, description, resolutionNotes) {
        var prompt =
            "You are a ServiceNow Knowledge Base writer.\n" +
            "Write a professional KB article from this resolved incident.\n" +
            "Use this format exactly:\n" +
            "Problem:\n" +
            "Cause:\n" +
            "Resolution Steps:\n\n" +
            "Short Description: " + shortDesc    + "\n" +
            "Description: "       + description  + "\n" +
            "Resolution Notes: "  + resolutionNotes;
        return this.sendMessage(prompt);
    },


    type: "ClaudeAI"
};
