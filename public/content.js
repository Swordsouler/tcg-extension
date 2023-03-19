const GRAPHQL_ENDPOINT =
    "https://wckta6btbra3vflgp7wyfhtwgi.appsync-api.eu-west-3.amazonaws.com/graphql";
const GRAPHQL_API_KEY = "da2-u4thh2625jbdvgi5biipvahfwq";

let span;
let enterPressed = false;
let cooldown = 0;
let twitchID = localStorage.getItem("twitchID") ?? "";
let keyDownListener = null;
let keyUpListener = null;

let createSpan = setInterval(searchButton, 5000);

async function searchButton() {
    let div = document.querySelector(
        "#live-page-chat > div > div > div > div > div > section > div > div.Layout-sc-1xcs6mc-0.bGyiZe.chat-input > div:nth-child(2) > div.Layout-sc-1xcs6mc-0.XTygj.chat-input__buttons-container > div.Layout-sc-1xcs6mc-0.hROlnu > div > div > div > div.Layout-sc-1xcs6mc-0.imLGzh"
    );
    if (!div) {
        div = document.querySelector(
            "#root > div > div.Layout-sc-1xcs6mc-0.htmBdw > div > div > section > div > div.Layout-sc-1xcs6mc-0.bGyiZe.chat-input > div:nth-child(2) > div.Layout-sc-1xcs6mc-0.XTygj.chat-input__buttons-container > div.Layout-sc-1xcs6mc-0.hROlnu > div > div > div > div.Layout-sc-1xcs6mc-0.imLGzh"
        );
    }

    if (div) {
        //add flex wrap to the div
        div.style.flexWrap = "wrap";

        clearInterval(createSpan);
        cooldown = (await canCollect(twitchID)) ?? 0;
        twitchID = localStorage.getItem("twitchID") ?? "";
        if (!twitchID) setupTwitchID();
        span = document.createElement("span");
        span.innerHTML = "";
        span.style.paddingRight = "10px";
        span.style.paddingLeft = "10px";
        span.style.color = "#fcbb62";
        span.style.fontWeight = "bold";
        span.style.cursor = "default";
        span.onclick = setupTwitchID;
        div.appendChild(span);
        //add event listener when enter is clicked but do it only once
        keyDownListener = document.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !enterPressed) {
                enterPressed = true;
                if (cooldown <= 0) {
                    setTimeout(async () => {
                        cooldown = (await canCollect(twitchID)) ?? 0;
                    }, 3000);
                }
            }
        });
        keyUpListener = document.addEventListener("keyup", (e) => {
            if (e.key === "Enter" && enterPressed) {
                enterPressed = false;
            }
        });

        const timer = setInterval(() => {
            if (cooldown <= 0) {
                span.innerHTML = "Pull";
            } else {
                // write the cooldown in format mm:ss (05:08)
                const minutes = Math.floor(cooldown / 60000);
                const seconds = ((cooldown % 60000) / 1000).toFixed(0);
                span.innerHTML = `${minutes < 10 ? "0" : ""}${minutes}:${
                    seconds < 10 ? "0" : ""
                }${seconds}`;
                cooldown -= 1000;
            }
            //vérifier que span est bien dans le DOM
            if (!document.body.contains(span)) {
                clearInterval(timer);
                createSpan = setInterval(searchButton, 5000);
                document.removeEventListener("keydown", keyDownListener);
                document.removeEventListener("keyup", keyUpListener);
            }
        }, 1000);
    }
}

const queryUserCardsByDate = /* GraphQL */ `
    query USER_CARD_BY_DATE($userID: String!) {
        userCardsByDate(userID: $userID, limit: 1, sortDirection: DESC) {
            items {
                card {
                    rarity
                }
                createdAt
            }
        }
    }
`;

async function canCollect(twitchID) {
    if (!twitchID) return null;
    const variables = {
        userID: twitchID,
    };

    const options = {
        method: "POST",
        headers: {
            "x-api-key": GRAPHQL_API_KEY,
        },
        body: JSON.stringify({ query: queryUserCardsByDate, variables }),
    };

    let statusCode = 200;
    let body;
    let response;

    try {
        response = await fetch(GRAPHQL_ENDPOINT, options);
        body = await response.json();
        if (body.errors) statusCode = 400;
    } catch (error) {
        statusCode = 400;
        body = {
            message: error.message,
            stack: error.stack,
        };
    }
    if (statusCode !== 200) return null;
    const userCards = body.data.userCardsByDate.items;
    if (userCards.length === 0) {
        return 0;
    } else {
        //cooldown === now - (lastCard + rarityCooldown)
        const cooldown =
            new Date(userCards[0].createdAt).getTime() +
            rarityToCooldown(userCards[0].card.rarity) -
            new Date().getTime();
        return cooldown;
    }
}

function rarityToCooldown(rarity) {
    const minuteRatio = 1000 * 60;
    switch (rarity) {
        case "COMMON":
            return 10 * minuteRatio;
        case "RARE":
            return 15 * minuteRatio;
        case "EPIC":
            return 20 * minuteRatio;
        case "LEGENDARY":
            return 30 * minuteRatio;
    }
}

function setupTwitchID() {
    const answer = prompt(
        "Entrez votre code Twitch, ou bien le lien de votre collection de cartes :",
        twitchID
    );
    //convert the link to the twitchID (https://swordsouler.fr/collection/107968853 -> 107968853)

    if (answer) {
        if (answer.includes("swordsouler.fr/collection/"))
            twitchID = answer.split("swordsouler.fr/collection/")[1];
        else twitchID = answer;
        localStorage.setItem("twitchID", twitchID);
    }
}
