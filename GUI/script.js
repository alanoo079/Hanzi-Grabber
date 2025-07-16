let grabbutton = document.getElementById("grabbutton");
let resultmsg = document.getElementById("resultbox");
let id;
let tab;
function gettext(id, callback){
    chrome.scripting.executeScript({
        target: { tabId: id },
        func: () => {
            let str = document.body.innerText;
            const cleanedStr = str.replace(/[^\u4e00-\u9fff]/g, ''); // thank you stackoverflow :D https://stackoverflow.com/questions/2718196/find-all-chinese-text-in-a-string-using-python-and-regex
            const allhanzi = cleanedStr.split('');
            if (allhanzi.length > 0) {
                const uniquehanzi = [...new Set(allhanzi)];
                const spacedhanzi = uniquehanzi.join(' ');
                return spacedhanzi;
            }
            return '';
        }
    }, (results) => {
        if (results && results[0]) {
            callback(results[0].result);
        }
    });
}


grabbutton.addEventListener("click", function(){

    console.log("hello");
    chrome.tabs.query({active: true}, (tabs) => {
        tab = tabs[0];
        id = tab.id
        gettext(id, (text) => {
            if (text === '') {
                // alert('No Hanzi Found on page :(');
                resultmsg.innerHTML = "No hanzi found on page";
                resultmsg.style.color = "red";
            } else {
                // alert(text);
                navigator.clipboard.writeText(text);
                let hanziCount = text.split(' ').length;
                resultmsg.innerHTML = `Found ${hanziCount} hanzi & copied to clipboard`;
                resultmsg.style.color = "green";
            }
        });
    });

});