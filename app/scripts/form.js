const partialErrorResponse = {
  success: false,
  type: "warning",
  message: "Whatsapp message sent successfully. Error adding private note",
};

function generatePrivateMessageParts(
  templateContents,
  templateIndex,
  placeholders
) {
  var templateContent = templateContents.split("||")[templateIndex];
  placeholders.forEach((placeholder, index) => {
    const target = `{{${index + 1}}}`;
    templateContent = templateContent.replaceAll(target, placeholder);
  });
  return [{ text: { content: templateContent } }];
}

async function generateWhatsappData(formData, namespace, storage) {
  return {
    from: {
      phone_number: formData.sendFrom,
    },
    provider: "whatsapp",
    to: [{ phone_number: formData.sendTo }],
    data: {
      message_template: {
        storage: storage,
        template_name: formData.template,
        namespace: namespace,
        language: { policy: "deterministic", code: "en" },
        rich_template_data: {
          body: {
            params: formData.placeholders.split("||").map((data) => ({ data })),
          },
        },
      },
    },
  };
}

async function getUserAndConversation(formData) {
  let conversationId, user;
  if ((await client.data.get("user")).user.phone == formData.sendTo) {
    user = (await client.data.get("user")).user;
    conversationId = (await client.data.get("conversation")).conversation
      .conversation_id;
  } else {
    // check if user with phone exists
    const users = await filterUsersByPhone(formData.sendTo);
    if (!users) return false;
    if (users.length > 0) {
      user = users[0];
      let conversations = await getConversationsByUserId(user.id);
      if (!conversations) return false;
      if (conversations.length > 0) {
        conversationId = conversations[0].id;
      }
    } else {
      // Create new user
      user = await createUser({
        phone: formData.sendTo,
        properties: [{ name: "whatsapp_userId", value: formData.sendTo }],
      });
    }
  }
  return { user, conversationId };
}

async function triggerAPICalls(formData, namespace) {
  const { user, conversationId } = await getUserAndConversation(formData);
  const storage = "none";

  const whatsappData = await generateWhatsappData(formData, namespace, storage);
  const whatsappResponse = await sendWhatsappTemplate(whatsappData);
  if (!whatsappResponse?.request_id) {
    return {
      success: false,
      type: "error",
      message: "Failed to send whatsapp message",
    };
  }
  const templateContents = (await client.iparams.get("templateContents"))
    .templateContents;
  const message = {
    message_parts: generatePrivateMessageParts(
      templateContents,
      formData.templateName - 1,
      formData.placeholders.split("||")
    ),
    reply_parts: [],
    message_type: "private",
    actor_type: "bot",
  };

  // check if conversationId exists
  if (conversationId) {
    sendMessageToConversation(conversationId, message);
  } else {
    const iParams = await client.iparams.get();
    const channelId = iParams.channel_id;
    if (channelId) {
      const conversation = {
        status: "new",
        messages: [message],
        channel_id: channelId,
        properties: {
          priority: "Low",
          cf_type: "General Query",
          cf_rating: "3",
          cf_supported_products: ["Freshchat", "Freshdesk"],
        },
        users: [{ id: user.id }],
      };
      sendMessageToNewConversation(conversation);
    } else {
      return partialErrorResponse;
    }
  }
  return {
    success: true,
    type: "success",
    message: "Message sent successfully",
  };
}

async function initForm() {
  const templatesData = (await client.iparams.get("templates")).templates;
  const placeholderCountData = (await client.iparams.get("placeholders"))
    .placeholders;
  const sendFromData = (await client.iparams.get("messaging_numbers"))
    .messaging_numbers;
  const namespace = (await client.iparams.get("namespace")).namespace;
  const templates = templatesData.split("||");
  const placeholderCounts = placeholderCountData.split("||");
  const sendFromNumbers = sendFromData.split("||");

  var form = document.createElement("fw-form");
  form.addEventListener("fwFormValueChanged", async (e) => {
    if (e.detail.field == "templateName") {
      let formValues = (await form.getValues()).values;
      form.initialValues = {
        ...formValues,
        placeholderCount: placeholderCounts[e.detail.value - 1],
      };
    }
  });
  var formContainer = document.querySelector("#form-container");
  document.querySelector("#submit").addEventListener("click", async (e) => {
    const { values, isValid } = await form.doSubmit(e);
    if (isValid) {
      // validate phoneNumber
      if (!values?.sendTo || !values.sendTo.match(/^(\+)[0-9]{6,20}$/)) {
        client.interface.trigger("showNotify", {
          type: "warning",
          message: "Please enter a valid send to phone number",
        });
        return;
      }

      // validate placeholders
      if (
        !values.placeholders ||
        values.placeholders.split("||").length != values.placeholderCount
      ) {
        client.interface.trigger("showNotify", {
          type: "warning",
          message: "Please enter correct number of placeholders",
        });
        return;
      }
      values.template = templates[values.templateName - 1];
      console.log("Form Values", values);

      const apiCallResponse = await triggerAPICalls(values, namespace);
      client.interface.trigger("showNotify", {
        type: apiCallResponse.type,
        message: apiCallResponse.message,
      });
      if (apiCallResponse.success) {
        form.doReset(e);
      }
    }
  });
  var formSchema = {
    name: "Whatsapp Form",
    fields: [
      {
        id: "42aecb8f-25cf-47ce-89c6-5410fe3d4315",
        name: "sendFrom",
        label: "Send From",
        type: "DROPDOWN",
        position: 1,
        required: true,
        placeholder: "Select…",
        choices: sendFromNumbers.map((number, index) => ({
          id: number,
          value: number,
          position: index + 1,
          dependent_ids: {},
        })),
      },
      {
        id: "2978f820-704b-46c7-9f88-110e14e34a8c",
        name: "sendTo",
        label: "Send to",
        type: "TEXT",
        position: 2,
        required: true,
        placeholder: "+6599999999",
        choices: [],
      },
      {
        id: "42aecb8f-25cf-47ce-89c6-5410fe3d4315",
        name: "templateName",
        label: "Message Template",
        type: "DROPDOWN",
        position: 3,
        required: true,
        placeholder: "Select…",
        choices: templates.map((template, index) => {
          return {
            id: index + 1,
            value: template,
            position: index + 1,
            dependent_ids: {},
          };
        }),
      },
      {
        id: "3978f820-704b-46c7-9f88-110e14e34a8c",
        name: "placeholderCount",
        label: "Number of Placeholders",
        type: "TEXT",
        position: 4,
        required: false,
        placeholder: "",
        editable: false,
        choices: [],
        maxlength: 10,
      },
      {
        id: "8978f820-704b-46c7-9f88-110e14e34a8c",
        name: "placeholders",
        label: "Placeholders",
        type: "TEXT",
        position: 5,
        required: true,
        placeholder: "data1||data2||data3...",
        choices: [],
      },
    ],
  };

  const validationSchema = Yup.object().shape({
    sendFrom: Yup.mixed().required("Please select a valid number"),
    // sendTo: Yup.string()
    //     .required('Please enter a valid number')
    //     .matches(/^(\+)[0-9]{6,20}$/, "Please enter a valid number"),
    templateName: Yup.string().required("Please select a valid template"),
    // placeholders: Yup.string()
    //     // .required('Please enter correct number of placeholders')
    //     .test(
    //         "is-valid-count",
    //         "Please enter correct number of placeholders",
    //         async (value) => {
    //             if (!value)
    //                 return false;
    //             const formValues = await form.getValues();
    //             const placeholderCount = formValues.values.placeholderCount;
    //             return value?.split("||").length == placeholderCount
    //         }
    //     )
  });

  var initialValues = {
    sendFrom: sendFromNumbers[0],
    sendTo: "",
    templateName: 1,
    placeholderCount: placeholderCounts[0],
  };
  formContainer.prepend(form);
  var fields = formSchema.fields.map((field) => {
    if (field.type === "DROPDOWN" || field.type === "MULTI_SELECT") {
      return {
        ...field,
        choices: field.choices?.map((f) => {
          return {
            ...f,
            text: f.value,
            value: f.id,
          };
        }),
      };
    } else return field;
  });

  var formSchema1 = {
    ...formSchema,
    fields: fields,
  };
  form.formSchema = formSchema1;
  form.initialValues = initialValues;
  form.validationSchema = validationSchema;
}
