const processResponse = (res) => {
    try {
        return JSON.parse(res.response);
    } catch (e) {
        return {error: e.message};
    }
}

const getUser = async (userId) => {
    const response = await client.request.invokeTemplate("getFreshchatUserById", {context: {userId}});
    return processResponse(response);
}

// const filterUsersByFirstName = async (firstName) => {
//     const res = await client.request.invokeTemplate("filterUsersByFirstName", {context: {firstName}});
//     return processResponse(res).users;
// }

const filterUsersByPhone = async (phone) => {
    const res = await client.request.invokeTemplate("filterUsersByPhone", {context: {phone}});
    return processResponse(res)?.users;
}

const createUser = async (user) => {
    const res = await client.request.invokeTemplate("createUser", {body: JSON.stringify(user)});
    return processResponse(res);
}

const getConversationsByUserId = async (userId) => {
    const res = await client.request.invokeTemplate("getConversationsByUserId", {context: {userId}});
    return processResponse(res)?.conversations;
}

const getConversationMessages = async (conversationId) => {
    const res = await client.request.invokeTemplate("getConversationMessages", {context: {conversationId}});
    return processResponse(res)?.messages;
}

const sendMessageToConversation = async (conversationId, message) => {
    const res = await client.request.invokeTemplate("sendMessageToConversation", {context: {conversationId}, body: JSON.stringify(message)});
    return processResponse(res);
}

const sendMessageToNewConversation = async (conversation) => {
    const conversationBody = JSON.stringify(conversation);
    const res = await client.request.invokeTemplate("sendMessageToNewConversation", {body:conversationBody});
    return processResponse(res);
}

const sendWhatsappTemplate = async (whatsappData) => {
    const res = await client.request.invokeTemplate("sendWhatsappTemplate", {body: JSON.stringify(whatsappData)});
    return processResponse(res);
}

