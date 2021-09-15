export function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function unique(items) {
  return [...new Set(items)];
}

export function groupBy(items, keyPath) {
  const keyPathArr = keyPath.split(".");
  const groupedBy = {};

  for (const item of items) {
    const groupId = keyPathArr.reduce((acc, key) => acc[key], item);
    if (!groupedBy[groupId]) {
      groupedBy[groupId] = [];
    }
    groupedBy[groupId].push(item);
  }

  return groupedBy;
}

export function createEventReceiver(
  nbMessagesToReceive,
  { nbMaxSeconds = 2 } = {}
) {
  const messages = [];
  const intervalTime = 100;
  const nbMaxRetry = Math.round((nbMaxSeconds * 1000) / intervalTime);
  return {
    give(message) {
      messages.push(message);
    },
    async wait() {
      let retryNb = 0;
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (
            messages.length === nbMessagesToReceive ||
            retryNb === nbMaxRetry
          ) {
            clearInterval(interval);
            resolve(messages);
          }
          retryNb += 1;
        }, intervalTime);
      });
    },
  };
}

export function toCamelcaseKeys(o) {
  let formattedO = {};
  for (const key in o) {
    let value = o[key];
    if (Array.isArray(value)) {
      value = value.map((v) => toCamelcaseKeys(v));
    } else if (typeof value === "object") {
      value = toCamelcaseKeys(value);
    }

    formattedO[toCamelCase(key)] = o[key];
  }
  return formattedO;
}

export function accessPropByPath(o, keyPath) {
  const keyPathArr = keyPath.split(".");
  return keyPathArr.reduce((acc, key) => acc[key], o);
}

export function plural(str, nb) {
  return [0, 1].includes(nb) ? str : str + "s";
}

export function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

export function copyToClipboard(value) {
  const $input = document.createElement("input");
  $input.type = "text";
  $input.value = value;
  document.body.appendChild($input);
  $input.select();
  let success = true;
  try {
    document.execCommand("copy");
  } catch (err) {
    alert(
      "Oops, unable to copy to clipboard. Please check website permissions."
    );
    success = false;
  }
  $input.remove();
  return success;
}

export function removeHashFromUrl() {
  history.pushState(
    "",
    document.title,
    window.location.pathname + window.location.search
  );
}

export function createWsConnection(
  url,
  { retryDelay = 2000, verbose = false } = {}
) {
  let activeWs;
  let activeWsClosedManually = false;
  const addedListeners = [];

  function connect(url, { verbose = false } = {}) {
    const ws = new WebSocket(url);

    ws.addEventListener("open", () => {
      verbose && console.info(`WS > OPEN`);
      activeWsClosedManually = false;
      activeWs = ws;
      verbose &&
        console.info(`Connected successfully to Websocket server: ${url}`);
      const listenersOnOpen = addedListeners.filter((l) => l.event === "open");
      for (const { listener } of listenersOnOpen) {
        listener();
      }
    });
    if (verbose) {
      ws.addEventListener("close", () => {
        console.info(`WS > CLOSE`);
      });

      ws.addEventListener("error", () => {
        console.info(`WS > ERROR`);
      });
    }

    return ws;
  }

  function createNewConnection() {
    const ws = connect(url, { verbose });

    ws.addEventListener("open", () => {
      for (const { event, listener } of addedListeners) {
        ws.addEventListener(event, listener);
      }
    });

    ws.addEventListener("close", () => {
      if (!activeWsClosedManually) {
        setTimeout(createNewConnection, retryDelay);
      }
    });
  }

  return {
    connect() {
      createNewConnection();
    },
    on(event, listener) {
      addedListeners.push({ event, listener });
      activeWs && activeWs.addEventListener(event, listener);
    },
    close() {
      activeWsClosedManually = true;
      activeWs && activeWs.close();
    },
    send(v) {
      if (typeof v === "object" && v !== null) {
        v = JSON.stringify(v);
      }
      activeWs.send(v);
    },
    isConnected() {
      return Boolean(activeWs);
    },
  };
}

export function createWsRooms() {
  const clientRooms = {};

  function getRoom(name) {
    return clientRooms[name];
  }

  function createRoom(name) {
    clientRooms[name] = [];
    return getRoom(name);
  }

  function joinRoom(roomName, client) {
    let room = getRoom(roomName);
    if (!room) {
      room = createRoom(roomName);
    }

    room.push(client);

    function leave() {
      leaveRoom(roomName, client);
    }

    client.on("close", () => {
      leaveRoom(roomName, client);
    });

    return {
      leave,
      emit(data) {
        emitOnRoom(roomName, data);
      },
    };
  }

  function emitOnRoom(roomName, data) {
    const room = getRoom(roomName);
    if (Array.isArray(room)) {
      for (const client of room) {
        client.send(JSON.stringify(data));
      }
    }
  }

  function leaveRoom(name, clientToLeave) {
    const room = clientRooms[name];
    if (room) {
      const indexToRemove = room.findIndex(
        (client) => client === clientToLeave
      );
      if (indexToRemove > -1) {
        room.splice(indexToRemove, 1);
        if (room.length === 0) {
          delete clientRooms[name];
        }
      }
    }
  }

  return {
    joinRoom,
    emitOnRoom,
  };
}

export async function fetchYoutubeVideoInfo(id) {
  const data = await fetch(
    `https://www.youtube.com/oembed?url=https://youtu.be/${id}&format=json`
  ).then((res) => res.json());

  return data;
}

export function createLocaleStorage(k) {
  return {
    get() {
      return localStorage.getItem(k);
    },
    set(v) {
      localStorage.setItem(k, v);
    },
  };
}
