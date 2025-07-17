let grabbutton = document.getElementById("grabbutton");
let resultmsg = document.getElementById("resultbox");

let simplified_button = document.getElementById("simplified");
let traditional_button = document.getElementById("traditional");
let all_button = document.getElementById("all");

let switchhanzi = document.getElementById("changeform");

let id;
let tab;

function getsettingconverter(callback){
    chrome.storage.sync.get(['converter'], (result) => {
        callback(result.converter);
    });
}

document.addEventListener("DOMContentLoaded", (event) => {
    chrome.storage.sync.get(['converter'], (result) => {
        // alert('Value retrieved: ' + result.converter);
        if (result.converter === "simplified") {
            simplified_button.style.background = "#009d46";
        }
        else if (result.converter === "traditional") {
            traditional_button.style.background = "#009d46";
        }
        else if (result.converter === "all") {
            all_button.style.background = "#009d46";
        } else {
            changesettingconverter("all");
        }
    });
});


function gettext(id, callback){
    getsettingconverter((setting) => {
        chrome.scripting.executeScript({
            target: { tabId: id },
            func: (conversionSetting) => {
                let str = document.body.innerText;
                const cleanedStr = str.replace(/[^\u4e00-\u9fff]/g, '');
                const allhanzi = cleanedStr.split('');
                if (allhanzi.length > 0) {
                    const uniquehanzi = [...new Set(allhanzi)];
                    const spacedhanzi = uniquehanzi.join(' ');
                    return spacedhanzi;
                }
                return '';
            },
            args: [setting]
        }, (results) => {
            if (results && results[0]) {
                callback(results[0].result);
            }
        });
    });
}

async function scrapepurplehanzi(hanzi, type) {
    // type: 'sctc' (simplified), 'tcsc' (traditional)
    const params = new URLSearchParams();
    params.append('hanzi', hanzi);
    params.append('type', type);
    const response = await fetch('https://www.purpleculture.net/traditional-simplified-converter/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        credentials: 'omit',
    });
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const resultTextarea = doc.querySelector('#hanzi');
    return resultTextarea ? resultTextarea.value : '';
}

function changesettingconverter(setting){
    chrome.storage.sync.set({converter: setting});
    location.reload();
}


grabbutton.addEventListener("click", function(){
    chrome.tabs.query({active: true}, (tabs) => {
        tab = tabs[0];
        id = tab.id
        gettext(id, async (text) => {
            if (text === '') {
                resultmsg.innerHTML = "No hanzi found on page :(";
                resultmsg.style.color = "red";
            } else {
                getsettingconverter(async (setting) => {
                    if (setting === "simplified") {
                        resultmsg.innerHTML = "Converting to Simplified...";
                        const converted = await scrapepurplehanzi(text.replace(/ /g, ''), 'tcsc');
                        const unique = [...new Set(converted.split(''))].join(' ');
                        navigator.clipboard.writeText(unique);
                        let hanziCount = unique.split(' ').length;
                        resultmsg.innerHTML = `Found ${hanziCount} simplified hanzi & copied to clipboard`;
                        resultmsg.style.color = "#0fd066";
                    } else if (setting === "traditional") {
                        resultmsg.innerHTML = "Converting to Traditional...";
                        const converted = await scrapepurplehanzi(text.replace(/ /g, ''), 'sctc');
                        const unique = [...new Set(converted.split(''))].join(' ');
                        navigator.clipboard.writeText(unique);
                        let hanziCount = unique.split(' ').length;
                        resultmsg.innerHTML = `Found ${hanziCount} traditional hanzi & copied to clipboard`;
                        resultmsg.style.color = "#0fd066";
                    } else {
                        navigator.clipboard.writeText(text);
                        let hanziCount = text.split(' ').length;
                        resultmsg.innerHTML = `Found ${hanziCount} hanzi & copied to clipboard`;
                        resultmsg.style.color = "#0fd066";
                    }
                });
            }
        });
    });

});

simplified_button.addEventListener("click", function(){
    changesettingconverter("simplified");
});

traditional_button.addEventListener("click", function(){
    changesettingconverter("traditional");
});

all_button.addEventListener("click", function(){
    changesettingconverter("all");
});

switchhanzi.addEventListener("click", function(){
    chrome.tabs.query({active: true}, (tabs) => {
        tab = tabs[0];
        id = tab.id
        gettext(id, async (text) => {
            if (text === '') {
                resultmsg.innerHTML = "No hanzi found on page to switch :(";
                resultmsg.style.color = "red";
            } else {
                getsettingconverter(async (setting) => {
                    if (setting === "simplified") {
                        resultmsg.innerHTML = "Switching to Simplified...";

                        const converted = await scrapepurplehanzi(text, 'tcsc');
                        
                        const originalChars = text.replace(/ /g, '').split('');
                        const convertedChars = converted.replace(/ /g, '').split('');
                        const charMap = {};
                        
                        for (let i = 0; i < originalChars.length; i++) {
                            if (originalChars[i] !== convertedChars[i]) {
                                charMap[originalChars[i]] = convertedChars[i];
                            }
                        }
                        
                        chrome.scripting.executeScript({
                            target: { tabId: id },
                            func: (characterMap) => {
                                function replaceTextInNode(node) {
                                    if (node.nodeType === Node.TEXT_NODE) {
                                        let text = node.textContent;
                                        let hasChanges = false;
                                        
                                        for (let original in characterMap) {
                                            if (text.includes(original)) {
                                                text = text.replace(new RegExp(original, 'g'), characterMap[original]);
                                                hasChanges = true;
                                            }
                                        }
                                        
                                        if (hasChanges) {
                                            node.textContent = text;
                                        }
                                    } else {
                                        for (let child of node.childNodes) {
                                            replaceTextInNode(child);
                                        }
                                    }
                                }
                                
                                replaceTextInNode(document.body);
                            },
                            args: [charMap]
                        });
                        const unique = [...new Set(converted.split(''))].join(' ');
                        let hanziCount = unique.split(' ').length;
                        resultmsg.innerHTML = `Switched the site's ${hanziCount} hanzi to simplified hanzi :D`;
                        resultmsg.style.color = "#0fd066";
                    } else if (setting === "traditional") {
                        resultmsg.innerHTML = "Switching to Traditional...";

                        const converted = await scrapepurplehanzi(text, 'sctc');
                        
                        const originalChars = text.replace(/ /g, '').split('');
                        const convertedChars = converted.replace(/ /g, '').split('');
                        const charMap = {};
                        
                        for (let i = 0; i < originalChars.length; i++) {
                            if (originalChars[i] !== convertedChars[i]) {
                                charMap[originalChars[i]] = convertedChars[i];
                            }
                        }
                        // thank you kind soul who i definitly didnt steal the text replace script from ;D
                        chrome.scripting.executeScript({
                            target: { tabId: id },
                            func: (characterMap) => {
                                function replaceTextInNode(node) {
                                    if (node.nodeType === Node.TEXT_NODE) {
                                        let text = node.textContent;
                                        let hasChanges = false;
                                        
                                        for (let original in characterMap) {
                                            if (text.includes(original)) {
                                                text = text.replace(new RegExp(original, 'g'), characterMap[original]);
                                                hasChanges = true;
                                            }
                                        }
                                        
                                        if (hasChanges) {
                                            node.textContent = text;
                                        }
                                    } else {
                                        for (let child of node.childNodes) {
                                            replaceTextInNode(child);
                                        }
                                    }
                                }
                                
                                replaceTextInNode(document.body);
                            },
                            args: [charMap]
                        });
                        const unique = [...new Set(converted.split(''))].join(' ');
                        let hanziCount = unique.split(' ').length;
                        resultmsg.innerHTML = `Switched the site's ${hanziCount} hanzi to traditional hanzi :D`;
                        resultmsg.style.color = "#0fd066";
                    } else {
                        resultmsg.innerHTML = `Please pick an option :D`;
                        resultmsg.style.color = "#ffffffff";
                    }
                });
            }
        });
    });

});