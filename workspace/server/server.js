const helper = require("./helper");

const PREFIX = "convo-";

/**
 * To retrieve the note from the data storage.
 *
 * @param {String} conversationId - The conversation_id of the Agent conversation.
 **/
function retrieveNote(conversationId) {
  $db.get(`${PREFIX}${conversationId}`).then(
    function(data) {
      console.log(data);
    },
    function(err) {
      console.log(err);
    }
  );
}

exports = {
  /**
   * To get the stored note.
   *
   * @param {String} conversationId - The conversation_id of the Agent conversation.
   **/
  getNote: function(payload) {
    const encodedConversationId = helper.encode(payload.conversation_id);
    console.log(encodedConversationId);
    retrieveNote(encodedConversationId).then(
      function(data) {
        console.info("Seccessfully fetched the note data from db");
        console.info(data);
        renderData(null, data);
      },
      function(error) {
        console.error("failed to store the key-value pair successfully");
        console.error(error);
        renderData(error);
      }
    );
  }
};
