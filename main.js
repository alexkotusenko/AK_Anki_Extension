// variables and consts
let loadedDeckName = "";
const addButton = document.getElementById("addButton");
const deckP = document.getElementById("deckP");
const dropdownDiv = document.getElementById("dropdownDiv");
const changeDeckCheckbox = document.getElementById("changeDeckCheckbox");
const frontInputField = document.getElementById("frontInputField");
const backInputField = document.getElementById("backInputField");
const htmlElement = document.getElementsByTagName("html");

function invoke(action, version, params = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("error", () => reject("failed to issue request"));
    xhr.addEventListener("load", () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (Object.getOwnPropertyNames(response).length != 2) {
          throw "response has an unexpected number of fields";
        }
        if (!response.hasOwnProperty("error")) {
          throw "response is missing required error field";
        }
        if (!response.hasOwnProperty("result")) {
          throw "response is missing required result field";
        }
        if (response.error) {
          throw response.error;
        }
        resolve(response.result);
      } catch (e) {
        reject(e);
      }
    });

    xhr.open("POST", "http://127.0.0.1:8765");
    xhr.send(JSON.stringify({ action, version, params }));
  });
}

const deckPDiv = document.getElementById("deckPDiv");
function displayOpenAnki() {
  let htmlToLoad =
    '<span style="color: red; font-weight: bold;">Please open Anki locally and reopen this extension to save new cards</span>';
  addButton.disabled = "true";
  changeDeckCheckbox.disabled = "true";
  deckPDiv.innerHTML = htmlToLoad;
}

function handleResolved(result) {
  try {
    const jsonObject = JSON.parse(result);
    console.log("JSON object:", jsonObject);
  } catch (error) {
    console.error("Error parsing JSON:", error);
  }
}

const deckSelect = document.getElementById("deckDropdown");

function fetchDecks(selectElement) {
  invoke("deckNames", 23)
    .then((result) => {
      // result is an array
      selectElement.innerHTML = "";
      for (let i = 0; i < result.length; i++) {
        selectElement.innerHTML +=
          '<option value="' + result[i] + '">' + result[i] + "</option>";
      }
      //console.info("INIT: fetchDecks() ran successfully!");
    })
    .catch((error) => {
      console.error("INIT: ERROR in fetchDecks()");
      displayOpenAnki();
    });
}

function getValueFromStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, function (data) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(data[key]);
      }
    });
  });
}

function getCurrentDeck(selectElement) {
  return selectElement.options[selectElement.selectedIndex].textContent;
}

console.log("HELLO WORLD FROM MY EXTENSION");
// addButton.innerHTML = "Add Card"; // works
addButton.addEventListener("click", () => {
  addNewCard();
});

function adaptUserInput(input) {
  input = input.replaceAll("\n", "<br>");
  return input;
}

frontInputField.style.transitionDuration = "0.15s";
backInputField.style.transitionDuration = "0.15s";
function addNewCard() {
  let req = {
    note: {
      modelName: "Basic",
      deckName: loadedDeckName,
      fields: {
        Front: adaptUserInput(frontInputField.value),
        Back: adaptUserInput(backInputField.value),
      },
      options: {
        allowDuplicate: true,
      },
    },
  };

  invoke("addNote", 23, req)
    .then((result) => {
      frontInputField.style.backgroundColor = "lime";
      backInputField.style.backgroundColor = "lime";
      setTimeout(() => {
        frontInputField.style.backgroundColor = "white";
        backInputField.style.backgroundColor = "white";
      }, 500);

      frontInputField.value = "";
      backInputField.value = "";
    })
    .catch((error) => {
      console.log(error);
      alert(error);
    });

  chrome.storage.local.set({ ankiCardFrontContent: "" });
  chrome.storage.local.set({ ankiCardBackContent: "" });
}

function controlEnterHandler(event) {
  // windows
  if (event.ctrlKey && event.key === "Enter") {
    addNewCard();
  }
  // mac
  else if (event.metaKey && event.key === "Enter") {
    addNewCard();
  }
}

frontInputField.addEventListener("keydown", controlEnterHandler);
backInputField.addEventListener("keydown", controlEnterHandler);

deckSelect.addEventListener("change", function () {
  //console.log("WRITRING CURRENT ANKI DECK SELECTED TO CHROME STORAGE");
  // Save the selected option to Chrome storage
  //console.log("value to be set: " + deckSelect.value);
  chrome.storage.local.set({ selectedAnkiDeckOption: deckSelect.value });

  // automatically update var
  getValueFromStorage("selectedAnkiDeckOption")
    .then((value) => {
      loadedDeckName = value;
      deckP.innerHTML = loadedDeckName;
      //console.log("FUNC CALLED: loadeddeckname: \"" + loadedDeckName + "\"");
    })
    .catch((error) => {
      loadedDeckName = "";
      //console.error("ERROR LOADING DECK NAME:( : " + error);
    });
});

let changeDeckMode = false;
// RUN WHEN THE DOM OF THE EXTENSION IS FULLY LOADED
document.addEventListener("DOMContentLoaded", () => {
  getValueFromStorage("ankiCardFrontContent")
    .then((value) => {
      if (value != undefined) {
        frontInputField.value = value;
      }
    })
    .catch((error) => {});
  getValueFromStorage("ankiCardBackContent")
    .then((value) => {
      if (value != undefined) {
        backInputField.value = value;
      }
    })
    .catch((error) => {});

  changeDeckMode = false;
  // fetch decks first
  fetchDecks(deckSelect);

  if (changeDeckMode) {
    deckSelect.value = loadedDeckName;
    dropdownDiv.appendChild(deckSelect);
  } else {
    if (dropdownDiv.contains(deckSelect)) {
      dropdownDiv.removeChild(deckSelect);
    }
  }

  getValueFromStorage("selectedAnkiDeckOption")
    .then((value) => {
      loadedDeckName = value;
      deckP.innerHTML = loadedDeckName;
      //console.log("ONLOAD: loadeddeckname: \"" + loadedDeckName + "\"");
    })
    .catch((error) => {
      loadedDeckName = "";
      //console.error("ERROR LOADING DECK NAME:( : " + error);
    });
});

changeDeckCheckbox.addEventListener("change", () => {
  // alert(changeDeckMode + " -> " + !changeDeckMode);

  changeDeckMode = !changeDeckMode;

  if (changeDeckMode == true) {
    // alert("Change Deck Mode turned on");
    // alert("loaded deck name: " + loadedDeckName);
    deckSelect.value = loadedDeckName;
    dropdownDiv.appendChild(deckSelect);
  } else {
    // alert("Change Deck Mode turned off");
    if (dropdownDiv.contains(deckSelect)) {
      dropdownDiv.removeChild(deckSelect);
    }
  }
});

frontInputField.addEventListener("input", () => {
  chrome.storage.local.set({ ankiCardFrontContent: frontInputField.value });
});

backInputField.addEventListener("input", () => {
  chrome.storage.local.set({ ankiCardBackContent: backInputField.value });
});
