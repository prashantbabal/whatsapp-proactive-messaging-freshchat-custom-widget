document.onreadystatechange = function() {
  if (document.readyState === 'interactive') renderApp();

  function renderApp() {
    var onInit = app.initialized();

    onInit.then(getClient).catch(handleErr);

    function getClient(_client) {
      window.client = _client;
      renderCustomerName();
      client.events.on('app.activated', autoFillCustomerPhone);
    }
  }
};

function renderCustomerName() {
  try {
    client.instance.resize({ height: "420px" });
  } catch (error) {
    console.error(error);
  }
  initForm();
}

function autoFillCustomerPhone() {
  client.data.get('user').then(function(data) {
    const phone = data.user.phone;
    document.getElementById('sendTo').value = phone;
  });
}

function handleErr(err = 'None') {
  console.error(`Error occured. Details:`, err);
}