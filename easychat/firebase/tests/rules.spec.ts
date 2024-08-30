import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import firebase from "firebase/compat/app";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  setLogLevel,
  Firestore,
  FieldValue,
  arrayRemove,
  arrayUnion,
  deleteField,
  increment,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import { before } from "mocha";
import { chatRoomRef, generateRandomId, getRoomPath } from "./functions";
import { ChatRoom, ChatUser } from "./models/chat_room";

/****** SETUP ********/
const PROJECT_ID = "withcenter-test-5";
const host = "127.0.0.1";
const port = 8080;
let testEnv: RulesTestEnvironment;

const appleId = "apple";
const bananaId = "banana";
const carrotId = "carrot";
const durianId = "durian";
const eggPlantId = "eggPlant";
const flowerId = "flower";
const guavaId = "guava";

const chatRooms = "chat-rooms";
const field = {
  // Single Order is the single order that is affected by read
  singleOrder: "sO",
  // Single Time Order is the single order that is only determined when the message was sent
  singleTimeOrder: "sTO",
  // Group Order is the group order that is affected by read
  groupOrder: "gO",
  // Group Time Order is the group order that is only determined when the message was sent
  groupTimeOrder: "gTO",
  // Order is the order that is affected by read wheter it is single or group
  order: "o",
  // Time Order is the order that is only determined when the message was sent
  timeOrder: "tO",
  // New Message Counter is the number of new message
  newMessageCounter: "nMC",
};

let unauthedDb: firebase.firestore.Firestore;
let appleDb: firebase.firestore.Firestore;
let bananaDb: firebase.firestore.Firestore;
let carrotDb: firebase.firestore.Firestore;
let durianDb: firebase.firestore.Firestore;
let eggPlantDb: firebase.firestore.Firestore;
let flowerDb: firebase.firestore.Firestore;
let guavaDb: firebase.firestore.Firestore;

async function clearAndResetFirestoreContext(): Promise<void> {
  await testEnv.clearFirestore();
  unauthedDb = testEnv.unauthenticatedContext().firestore();
  appleDb = testEnv.authenticatedContext(appleId).firestore();
  bananaDb = testEnv.authenticatedContext(bananaId).firestore();
  carrotDb = testEnv.authenticatedContext(carrotId).firestore();
  durianDb = testEnv.authenticatedContext(durianId).firestore();
  eggPlantDb = testEnv.authenticatedContext(eggPlantId).firestore();
  flowerDb = testEnv.authenticatedContext(flowerId).firestore();
  guavaDb = testEnv.authenticatedContext(guavaId).firestore();
}

// ===========================================================
// ================= Chat Room Viewing Test ==================
// ===========================================================
describe("Chat Room Viewing Test", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    group: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        o: 1,
        tO: 1,
        sO: 1,
        gO: 1,
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
    rejectedUsers: [flowerId],
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });

  it("[Pass] Master get doc of Chat Room (1)", async () => {
    await assertSucceeds(getDoc(doc(appleDb, getRoomPath(appleGroupId))));
  });
  it("[Pass] Master get doc of Chat Room (2)", async () => {
    await assertSucceeds(getDoc(doc(bananaDb, getRoomPath(appleGroupId))));
  });
  it("[Pass] Member get doc of Chat Room", async () => {
    await assertSucceeds(getDoc(doc(carrotDb, getRoomPath(appleGroupId))));
  });
  it("[Pass] Invited User get doc of Chat Room", async () => {
    await assertSucceeds(getDoc(doc(eggPlantDb, getRoomPath(appleGroupId))));
  });
  it("[Pass] Rejected User get doc of Chat Room", async () => {
    await assertSucceeds(getDoc(doc(flowerDb, getRoomPath(appleGroupId))));
  });
  it("[Fail] Outsider User get doc of Chat Room (1)", async () => {
    await assertFails(getDoc(doc(guavaDb, getRoomPath(appleGroupId))));
  });
  it("[Fail] Outsider User get doc of Chat Room (2)", async () => {
    await assertFails(getDoc(doc(durianDb, getRoomPath(appleGroupId))));
  });
  it("[Pass] Outsider User get doc of Open Chat Room", async () => {
    const appleGroupUpdate: ChatRoom = {
      open: true,
    };
    await setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
      merge: true,
    });
    await assertSucceeds(getDoc(doc(guavaDb, getRoomPath(appleGroupId))));
  });
  it("[Pass] All Mine Query", async () => {
    const query = appleDb
      .collection(chatRooms)
      .where("users." + appleId + "." + field.order, ">", 0)
      .orderBy("users." + appleId + "." + field.order, "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] allMineByTime Query", async () => {
    const query = appleDb
      .collection(chatRooms)
      .where("users." + appleId + "." + field.timeOrder, ">", 0)
      .orderBy("users." + appleId + "." + field.timeOrder, "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] open group chat Query", async () => {
    const updateIntoOpen = {
      open: true,
    } as ChatRoom;
    await setDoc(doc(appleDb, getRoomPath(appleGroupId)), updateIntoOpen, {
      merge: true,
    });
    const query = appleDb
      .collection(chatRooms)
      .where("open", "==", true)
      .orderBy("updatedAt", "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] single Query", async () => {
    const query = appleDb
      .collection(chatRooms)
      .where("users." + appleId + "." + field.singleOrder, ">", 0)
      .orderBy("users." + appleId + "." + field.singleOrder, "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] singleByTime Query", async () => {
    const query = appleDb
      .collection(chatRooms)
      .where("users." + appleId + "." + field.singleTimeOrder, ">", 0)
      .orderBy("users." + appleId + "." + field.singleTimeOrder, "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] group Query", async () => {
    const query = appleDb
      .collection(chatRooms)
      .where("users." + appleId + "." + field.groupOrder, ">", 0)
      .orderBy("users." + appleId + "." + field.groupOrder, "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] groupByTime Query", async () => {
    const query = appleDb
      .collection(chatRooms)
      .where("users." + appleId + "." + field.groupTimeOrder, ">", 0)
      .orderBy("users." + appleId + "." + field.groupTimeOrder, "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] received invites query", async () => {
    const query = eggPlantDb
      .collection(chatRooms)
      .where("invitedUsers", "array-contains", eggPlantId)
      .orderBy("updatedAt", "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] rejected invites query", async () => {
    const query = flowerDb
      .collection(chatRooms)
      .where("rejectedUsers", "array-contains", flowerId)
      .orderBy("updatedAt", "desc");
    await assertSucceeds(query.get());
  });

  it("[Pass] All Mine Query (2)", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("users." + guavaId + "." + field.order, ">", 0)
      .orderBy("users." + guavaId + "." + field.order, "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] allMineByTime Query (2)", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("users." + guavaId + "." + field.timeOrder, ">", 0)
      .orderBy("users." + guavaId + "." + field.timeOrder, "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] open group chat Query (2)", async () => {
    const updateIntoOpen = {
      open: true,
    } as ChatRoom;
    await setDoc(doc(appleDb, getRoomPath(appleGroupId)), updateIntoOpen, {
      merge: true,
    });
    const query = guavaDb
      .collection(chatRooms)
      .where("open", "==", true)
      .orderBy("updatedAt", "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] single Query (2)", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("users." + guavaId + "." + field.singleOrder, ">", 0)
      .orderBy("users." + appleId + "." + field.singleOrder, "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] singleByTime Query (2)", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("users." + guavaId + "." + field.singleTimeOrder, ">", 0)
      .orderBy("users." + guavaId + "." + field.singleTimeOrder, "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] group Query (2)", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("users." + guavaId + "." + field.groupOrder, ">", 0)
      .orderBy("users." + guavaId + "." + field.groupOrder, "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] groupByTime Query (2)", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("users." + guavaId + "." + field.groupTimeOrder, ">", 0)
      .orderBy("users." + guavaId + "." + field.groupTimeOrder, "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] received invites query (2)", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("invitedUsers", "array-contains", guavaId)
      .orderBy("updatedAt", "desc");
    await assertSucceeds(query.get());
  });
  it("[Pass] rejected invites query (2)", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("rejectedUsers", "array-contains", guavaId)
      .orderBy("updatedAt", "desc");
    await assertSucceeds(query.get());
  });

  it("[Fail] All Mine Query using different uid", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("users." + appleId + "." + field.order, ">", 0)
      .orderBy("users." + appleId + "." + field.order, "desc");
    await assertFails(query.get());
  });
  it("[Fail] allMineByTime Query using different uid", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("users." + appleId + "." + field.timeOrder, ">", 0)
      .orderBy("users." + appleId + "." + field.timeOrder, "desc");
    await assertFails(query.get());
  });
  it("[Fail] single Query using different uid", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("users." + appleId + "." + field.singleOrder, ">", 0)
      .orderBy("users." + appleId + "." + field.singleOrder, "desc");
    await assertFails(query.get());
  });
  it("[Fail] singleByTime Query using different uid", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("users." + appleId + "." + field.singleTimeOrder, ">", 0)
      .orderBy("users." + appleId + "." + field.singleTimeOrder, "desc");
    await assertFails(query.get());
  });
  it("[Fail] group Query using different uid", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("users." + appleId + "." + field.groupOrder, ">", 0)
      .orderBy("users." + appleId + "." + field.groupOrder, "desc");
    await assertFails(query.get());
  });
  it("[Fail] groupByTime Query using different uid", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("users." + appleId + "." + field.groupTimeOrder, ">", 0)
      .orderBy("users." + appleId + "." + field.groupTimeOrder, "desc");
    await assertFails(query.get());
  });
  it("[Fail] received invites query using different uid", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("invitedUsers", "array-contains", eggPlantId)
      .orderBy("updatedAt", "desc");
    await assertFails(query.get());
  });
  it("[Fail] rejected invites query using different uid", async () => {
    const query = guavaDb
      .collection(chatRooms)
      .where("rejectedUsers", "array-contains", flowerId)
      .orderBy("updatedAt", "desc");
    await assertFails(query.get());
  });
});

// ===========================================================
// ================ Chat Room Creation Test ==================
// ===========================================================
describe("Chat Room Creation Test", async () => {
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();
  });

  it("[Pass] Create Room with name as master and member (1)", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
      masterUsers: [appleId],
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Pass] Create Room with name as master, and member (2)", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
      group: true,
      masterUsers: [appleId],
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Pass] Create Open Group Chat", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
      group: true,
      open: true,
      masterUsers: [appleId],
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Pass] Create Room as  master, and member without name", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
      masterUsers: [appleId],
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Fail] Create Room with name and description but no masterUid", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Fail] Create Room with name and description but no member", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
      masterUsers: [appleId],
    };
    await assertFails(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Fail] Create Room with name but no member and master", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
    };
    await assertFails(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Fail] Create Room with Extra User as member", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
      masterUsers: [appleId],
      users: {
        [appleId]: {
          nMC: 0,
        },
        [bananaId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Fail] Create Room with Extra User as master (1)", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
      masterUsers: [appleId, bananaId],
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Fail] Create Room with Extra User as master (2)", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
      masterUsers: [appleId, bananaId],
      users: {
        [appleId]: {
          nMC: 0,
        },
        [bananaId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Fail] Create Room but member, and master is a different user", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
      masterUsers: [appleId],
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Fail] Create Room but master is a different user", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
      masterUsers: [appleId],
      users: {
        [bananaId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Fail] Create Room but users is a different user", async () => {
    const appleGroup: ChatRoom = {
      name: "apple group",
      masterUsers: [bananaId],
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Pass] Create Single Room", async () => {
    const appleGroup: ChatRoom = {
      name: "apple and banana",
      single: true,
      masterUsers: [appleId],
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleGroup)
    );
  });
  it("[Pass] Create Single Room with 1 invitation", async () => {
    const appleAndBananaRoom: ChatRoom = {
      name: "apple and banana",
      single: true,
      masterUsers: [appleId],
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
      invitedUsers: [bananaId],
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleAndBananaRoom)
    );
  });
  it("[Fail] Create Single Room with 2 invitations", async () => {
    const appleAndBananaRoom: ChatRoom = {
      name: "apple and banana",
      single: true,
      masterUsers: [appleId],
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
      invitedUsers: [bananaId, carrotId],
    };
    await assertFails(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleAndBananaRoom)
    );
  });
  it("[Fail] Create Single Room with 3 invitations", async () => {
    const appleAndBananaRoom: ChatRoom = {
      name: "apple and banana",
      single: true,
      masterUsers: [appleId],
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
      invitedUsers: [bananaId, carrotId, durianId],
    };
    await assertFails(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleAndBananaRoom)
    );
  });
  it("[Fail] Create Single Room but I am the invited", async () => {
    const appleAndBananaRoom: ChatRoom = {
      name: "apple and banana",
      single: true,
      masterUsers: [bananaId],
      users: {
        [bananaId]: {
          nMC: 0,
        },
      },
      invitedUsers: [appleId],
    };
    await assertFails(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleAndBananaRoom)
    );
  });
  it("[Fail] Create Single Room but I invited myself and another", async () => {
    const appleAndBananaRoom: ChatRoom = {
      name: "apple and banana",
      single: true,
      masterUsers: [appleId],
      users: {
        [appleId]: {
          nMC: 0,
        },
      },
      invitedUsers: [appleId, bananaId],
    };
    await assertFails(
      setDoc(doc(appleDb, getRoomPath(generateRandomId())), appleAndBananaRoom)
    );
  });
});

// ===========================================================
// ============== Group Chat Room Update Test ================
// ===========================================================
describe("Group Chat Room Update Test", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    masterUsers: [appleId, bananaId],
    group: true,
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
    },
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });

  // ================================

  it("[Pass] Update Room Name as Master", async () => {
    const appleGroupUpdate: ChatRoom = {
      name: "apple group better name",
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Pass] Update Room Description as Master", async () => {
    const appleGroupUpdate: ChatRoom = {
      description: "apple group better name",
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Pass] Update Room into Open as Master", async () => {
    const appleGroupUpdate: ChatRoom = {
      open: true,
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });

  it("[Pass] Update Room iconUrl as Master", async () => {
    const appleGroupUpdate: ChatRoom = {
      iconUrl: "12312",
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });

  it("[Pass] Update Room last message as Master", async () => {
    const appleGroupUpdate: ChatRoom = {
      lastMessageText: "lastMessageText",
      lastMessageAt: 123123,
      lastMessageUid: "lastMessageUid",
      lastMessageUrl: "lastMessageUrl",
      lastMessageId: "lastMessageId",
      lastMessageDeleted: false,
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });

  it("[Pass] Update Room verifiedUserOnly as Master", async () => {
    const appleGroupUpdate: ChatRoom = {
      verifiedUserOnly: false,
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Pass] Update Room urlForVerifiedUserOnly as Master", async () => {
    const appleGroupUpdate: ChatRoom = {
      urlForVerifiedUserOnly: false,
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Pass] Update Room uploadForVerifiedUserOnly as Master", async () => {
    const appleGroupUpdate: ChatRoom = {
      uploadForVerifiedUserOnly: false,
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Pass] Update Room gender as Master", async () => {
    const appleGroupUpdate: ChatRoom = {
      gender: "F",
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Pass] Update Room doman as Master", async () => {
    const appleGroupUpdate: ChatRoom = {
      domain: "domain",
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });

  it("[Pass] Update Room hasPassword as Master", async () => {
    const appleGroupUpdate: ChatRoom = {
      hasPassword: false,
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });

  it("[Fail] Update Room Name as Member", async () => {
    const appleGroupUpdate: ChatRoom = {
      name: "apple group better name",
    };
    await assertFails(
      setDoc(
        doc(carrotDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Fail] Update Room Description as Member", async () => {
    const appleGroupUpdate: ChatRoom = {
      description: "apple group better name",
    };
    await assertFails(
      setDoc(
        doc(carrotDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Fail] Update Room into Open as Member", async () => {
    const appleGroupUpdate: ChatRoom = {
      open: true,
    };
    await assertFails(
      setDoc(
        doc(carrotDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });

  it("[Fail] Update Room iconUrl as Member", async () => {
    const appleGroupUpdate: ChatRoom = {
      iconUrl: "12312",
    };
    await assertFails(
      setDoc(
        doc(carrotDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });

  it("[Fail] Update Room last message as Member (old way)", async () => {
    const appleGroupUpdate: ChatRoom = {
      lastMessageText: "lastMessageText",
      lastMessageAt: 123123,
      lastMessageUid: "lastMessageUid",
      lastMessageUrl: "lastMessageUrl",
      lastMessageId: "lastMessageId",
      lastMessageDeleted: false,
    };
    await assertFails(
      setDoc(
        doc(carrotDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Pass] Update Room lastMessageAt as Member", async () => {
    const appleGroupUpdate: ChatRoom = {
      lastMessageAt: 123123,
    };
    await assertSucceeds(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });

  it("[Fail] Update Room verifiedUserOnly as Member", async () => {
    const appleGroupUpdate: ChatRoom = {
      verifiedUserOnly: false,
    };
    await assertFails(
      setDoc(
        doc(carrotDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Fail] Update Room urlForVerifiedUserOnly as Member", async () => {
    const appleGroupUpdate: ChatRoom = {
      urlForVerifiedUserOnly: false,
    };
    await assertFails(
      setDoc(
        doc(carrotDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Fail] Update Room uploadForVerifiedUserOnly as Member", async () => {
    const appleGroupUpdate: ChatRoom = {
      uploadForVerifiedUserOnly: false,
    };
    await assertFails(
      setDoc(
        doc(carrotDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Fail] Update Room gender as Member", async () => {
    const appleGroupUpdate: ChatRoom = {
      gender: "F",
    };
    await assertFails(
      setDoc(
        doc(carrotDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Fail] Update Room doman as Member", async () => {
    const appleGroupUpdate: ChatRoom = {
      domain: "domain",
    };
    await assertFails(
      setDoc(
        doc(carrotDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });

  it("[Fail] Update Room hasPassword as Member", async () => {
    const appleGroupUpdate: ChatRoom = {
      hasPassword: false,
    };
    await assertFails(
      setDoc(
        doc(carrotDb, chatRoomRef + "/" + appleGroupId),
        appleGroupUpdate,
        {
          merge: true,
        }
      )
    );
  });

  // ================================

  it("[Pass] Master invited a user", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: [eggPlantId],
    };

    await assertSucceeds(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member invited a user", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: [eggPlantId],
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member invited a user", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: [eggPlantId],
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider invited a user", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: [flowerId],
    };
    await assertFails(
      setDoc(doc(eggPlantDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider invited himself", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: [eggPlantId],
    };
    await assertFails(
      setDoc(doc(eggPlantDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Joining to a non-open Group Chat", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [eggPlantId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(eggPlantDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

describe("Open Group Chat Room Joining Test (Open: True)", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    group: true,
    open: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();
    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });
  it("[Pass] Joining to an Open Group Chat, Not Invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(doc(flowerDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Pass] Joining to an Open Group Chat, Invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [eggPlantId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(doc(eggPlantDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Master put another user who is not invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Master put another user who is invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [eggPlantId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member put another user who is not invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member put another user who is invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [eggPlantId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

describe("Non-open Group Chat Room Joining Test (Open: Null)", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    // open: false
    group: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();
    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });
  it("[Pass] Joining to an Non-Open Group Chat, Invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [eggPlantId]: {
          nMC: 0,
        },
      },
      invitedUsers: arrayRemove(eggPlantId),
    };
    await assertSucceeds(
      setDoc(doc(eggPlantDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Joining to an Non-Open Group Chat, Not Invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
      invitedUsers: arrayRemove(flowerId),
    };
    await assertFails(
      setDoc(doc(flowerDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Master put another user who is not invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Master put another user who is invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [eggPlantId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member put another user who is not invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member put another user who is invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [eggPlantId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

describe("Non-open Group Chat Room Joining Test (Open: False)", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    open: false,
    group: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();
    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });

  it("[Pass] Joining to an Non-Open Group Chat, Invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [eggPlantId]: {
          nMC: 0,
        },
      },
      invitedUsers: arrayRemove(eggPlantId),
    };
    await assertSucceeds(
      setDoc(doc(eggPlantDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });

  it("[Fail] Joining to an Non-Open Group Chat, Not Invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
      invitedUsers: arrayRemove(flowerId),
    };
    await assertFails(
      setDoc(doc(flowerDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Master put another user who is not invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Master put another user who is invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [eggPlantId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member put another user who is not invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member put another user who is invited", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [eggPlantId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

describe("Single Chat Room Invitation Test (Pending Invite)", async () => {
  const appleGroup: ChatRoom = {
    name: "apple and banana",
    single: true,
    masterUsers: [appleId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      //   [bananaId]: {
      //     nMC: 0,
      //   },
    },
    invitedUsers: [bananaId],
  };
  let appleGroupId: string = "apple-banana-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  beforeEach(async () => {
    await clearAndResetFirestoreContext();
    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });
  it("[Fail] Master invited another user to a Single Chat", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(eggPlantId),
    };
    await assertFails(
      setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member invited a another to a Single Chat", async () => {
    const bananaAccept: ChatRoom = {
      invitedUsers: arrayRemove(bananaId),
      users: {
        [bananaId]: {
          nMC: 0,
        },
      },
    };
    await setDoc(doc(bananaDb, getRoomPath(appleGroupId)), bananaAccept, {
      merge: true,
    });

    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(eggPlantId),
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider Joining to a Single Chat where there is pending invitation", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [eggPlantId]: {
          nMC: 0,
        },
      },
      invitedUsers: arrayRemove(eggPlantId),
    };
    await assertFails(
      setDoc(doc(eggPlantDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider Inviting himself to a Single Chat there is pending invitation", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(eggPlantId),
    };
    await assertFails(
      setDoc(doc(eggPlantDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Invited user joins but adding extra people", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [bananaId]: {
          nMC: 0,
        },
        [eggPlantId]: {
          nMC: 0,
        },
      },
      invitedUsers: arrayRemove(bananaId),
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

describe("Single Chat Room Joining Test", async () => {
  const appleGroup: ChatRoom = {
    name: "apple and banana",
    single: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
    },
  };
  let appleGroupId: string = "apple-banana-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  beforeEach(async () => {
    await clearAndResetFirestoreContext();
    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });

  it("[Fail] Outsider Joining to a Single Chat", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [eggPlantId]: {
          nMC: 0,
        },
      },
      invitedUsers: arrayRemove(eggPlantId),
    };
    await assertFails(
      setDoc(doc(eggPlantDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider Replacing a user to a Single Chat", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [bananaId]: deleteField(),
        [eggPlantId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(eggPlantDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

describe("Non Open Group Chat Room Leaving Test", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
      [eggPlantId]: {
        nMC: 0,
      },
      [flowerId]: {
        nMC: 0,
      },
    },
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });

  it("[Pass] Member leaving a Group Chat", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [carrotId]: deleteField(),
      },
    };
    await assertSucceeds(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });

  it("[Pass] Master leaving a Group Chat", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [bananaId]: deleteField(),
      },
      masterUsers: arrayRemove(bananaId),
    };
    await assertSucceeds(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });

  it("[Fail] Member leaving a Group Chat and removing extra user", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [carrotId]: deleteField(),
        [eggPlantId]: deleteField(),
      },
    };

    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });

  it("[Pass] Master leaving a Group Chat and removing extra user", async () => {
    // Technically, it should be okay because,
    // Masters may be allowed to kickout other members
    const appleGroupUpdate: ChatRoom = {
      users: {
        [bananaId]: deleteField(),
        [eggPlantId]: deleteField(),
      },
    };

    await assertSucceeds(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

describe("Open Group Chat Room Leaving Test", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    open: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
      [eggPlantId]: {
        nMC: 0,
      },
      [flowerId]: {
        nMC: 0,
      },
    },
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });

  it("[Pass] Member leaving a Group Chat", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [carrotId]: deleteField(),
      },
    };
    await assertSucceeds(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });

  it("[Pass] Master leaving a Group Chat", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [bananaId]: deleteField(),
      },
      masterUsers: arrayRemove(bananaId),
    };
    await assertSucceeds(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });

  it("[Fail] Member leaving a Group Chat and removing extra user", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [carrotId]: deleteField(),
        [eggPlantId]: deleteField(),
      },
    };

    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });

  it("[Pass] Master leaving a Group Chat and removing extra user", async () => {
    // Technically, it should be okay because,
    // Masters may be allowed to kickout other members
    // "Although, master should not be leaving the room"
    // it is not a security issue.
    const appleGroupUpdate: ChatRoom = {
      users: {
        [bananaId]: deleteField(),
        [eggPlantId]: deleteField(),
      },
    };

    await assertSucceeds(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

// =======================================================================
// ======================= Reject Chat Room Test =========================
// =======================================================================

describe("Reject Chat Room Test", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    group: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });

  it("[Pass] User rejected the invitation", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayRemove(eggPlantId),
      rejectedUsers: arrayUnion(eggPlantId),
    };
    await assertSucceeds(
      setDoc(doc(eggPlantDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });

  it("[Fail] Not-invited User rejected the invitation (Pass or Fail)", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayRemove(flowerId),
      rejectedUsers: arrayUnion(flowerId),
    };
    // Pass or Fail, this is not a security issue
    await assertFails(
      setDoc(doc(flowerDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });

  it("[Fail] Member suddenly rejected the invitation (Pass or Fail)", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayRemove(carrotId),
      rejectedUsers: arrayUnion(carrotId),
    };

    // Pass or Fail, this is not a security issue
    // We simply have to be aware
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

// =======================================================================
// ================== Accept Rejected Chat Room Test =====================
// =======================================================================

describe("Accept Rejected Chat Room Test", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    group: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
    rejectedUsers: [flowerId],
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });

  it("[Pass] User accepted the invitation but rejected initially", async () => {
    const appleGroupUpdate: ChatRoom = {
      rejectedUsers: arrayRemove(flowerId),
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(doc(flowerDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Master tried to force to accept the invitation but rejected already", async () => {
    const appleGroupUpdate: ChatRoom = {
      rejectedUsers: arrayRemove(flowerId),
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member tried to force to accept the invitation but rejected already", async () => {
    const appleGroupUpdate: ChatRoom = {
      rejectedUsers: arrayRemove(flowerId),
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider tried to force to accept the invitation but rejected already", async () => {
    const appleGroupUpdate: ChatRoom = {
      rejectedUsers: arrayRemove(flowerId),
      users: {
        [flowerId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

// =======================================================================
// ========================= Reads Meta Updating =========================
// =======================================================================

describe("Reads Meta Updating Test", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    group: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
    rejectedUsers: [flowerId],
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });

  it("[Pass] User added 1 in new message counter (nMC) for other users", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [appleId]: {
          nMC: increment(1),
        },
        [bananaId]: {
          nMC: increment(1),
        },
        [carrotId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] User added 1 in new message counter (nMC) for other users & replacing another user", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [appleId]: {
          nMC: increment(1),
        },
        [bananaId]: deleteField(),
        [guavaId]: {
          nMC: increment(1),
        },
        [carrotId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] User added 1 in new message counter (nMC) for other users & replacing another user (2)", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [appleId]: {
          nMC: increment(1),
        },
        [guavaId]: {
          nMC: increment(1),
        },
        [carrotId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      updateDoc(doc(carrotDb, getRoomPath(appleGroupId)), {
        data: appleGroupUpdate,
      })
    );
  });
});

// =======================================================================
// ========================== Kick Out Members ===========================
// =======================================================================

describe("Kick Out Members Test", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    group: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
      [durianId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
    rejectedUsers: [flowerId],
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });

  it("[Pass] Master removed 1 user", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [carrotId]: deleteField(),
      },
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Pass] Master removed other master", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [bananaId]: deleteField(),
      },
      masterUsers: arrayRemove(bananaId),
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member removed 1 other user", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [carrotId]: deleteField(),
      },
    };
    await assertFails(
      setDoc(doc(durianDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider removed 1 other user", async () => {
    const appleGroupUpdate: ChatRoom = {
      users: {
        [carrotId]: deleteField(),
      },
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

// =======================================================================
// ========================= Delete Doc Test =============================
// =======================================================================

describe("Delete Doc", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    group: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
      [durianId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
    rejectedUsers: [flowerId],
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });
  it("[Pass] Master delete doc", async () => {
    await assertSucceeds(deleteDoc(doc(appleDb, getRoomPath(appleGroupId))));
  });
  it("[Fail] Member delete doc", async () => {
    await assertFails(deleteDoc(doc(durianDb, getRoomPath(appleGroupId))));
  });
  it("[Fail] Outsider delete doc", async () => {
    await assertFails(deleteDoc(doc(guavaDb, getRoomPath(appleGroupId))));
  });
});

// =======================================================================
// ========================= Block User Test =============================
// =======================================================================

describe("Block User in Room", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    group: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
      [durianId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
    rejectedUsers: [flowerId],
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });
  it("[Pass] Master block outsider in her room", async () => {
    const appleGroupUpdate: ChatRoom = {
      blockedUsers: arrayUnion(guavaId),
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Pass] Master block member in her room", async () => {
    // Users should be kicked out from the room first
    // But it is not a security issue if master blocked a member
    const appleGroupUpdate: ChatRoom = {
      blockedUsers: arrayUnion(bananaId),
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Pass] Master block member in her room (2)", async () => {
    const appleGroupUpdate: ChatRoom = {
      blockedUsers: arrayUnion(carrotId),
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member block user in room", async () => {
    const appleGroupUpdate: ChatRoom = {
      blockedUsers: arrayUnion(guavaId),
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member block master in room", async () => {
    const appleGroupUpdate: ChatRoom = {
      blockedUsers: arrayUnion(appleId),
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member block member in room", async () => {
    const appleGroupUpdate: ChatRoom = {
      blockedUsers: arrayUnion(durianId),
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });

  it("[Pass] Master user tries to unblock", async () => {
    const appleGroupUpdate: ChatRoom = {
      blockedUsers: arrayUnion(guavaId),
    };
    await setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
      merge: true,
    });

    const appleGroupUpdateRemoveBlock: ChatRoom = {
      blockedUsers: arrayRemove(guavaId),
    };
    await assertSucceeds(
      setDoc(
        doc(appleDb, getRoomPath(appleGroupId)),
        appleGroupUpdateRemoveBlock,
        {
          merge: true,
        }
      )
    );
  });
  it("[Fail] Block user tries to unblock", async () => {
    const appleGroupUpdate: ChatRoom = {
      blockedUsers: arrayUnion(guavaId),
    };
    await setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
      merge: true,
    });

    const appleGroupUpdateRemoveBlock: ChatRoom = {
      blockedUsers: arrayRemove(guavaId),
    };
    await assertFails(
      setDoc(
        doc(guavaDb, getRoomPath(appleGroupId)),
        appleGroupUpdateRemoveBlock,
        {
          merge: true,
        }
      )
    );
  });
  it("[Fail] Member user tries to unblock a different user", async () => {
    const appleGroupUpdate: ChatRoom = {
      blockedUsers: arrayUnion(guavaId),
    };
    await setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
      merge: true,
    });
    const appleGroupUpdateRemoveBlock: ChatRoom = {
      blockedUsers: arrayRemove(guavaId),
    };
    await assertFails(
      setDoc(
        doc(carrotDb, getRoomPath(appleGroupId)),
        appleGroupUpdateRemoveBlock,
        {
          merge: true,
        }
      )
    );
  });
  it("[Fail] Member leaves the room and tries to unblock a different user", async () => {
    const appleGroupUpdate: ChatRoom = {
      blockedUsers: arrayUnion(guavaId),
    };
    await setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
      merge: true,
    });
    const appleGroupUpdateRemoveBlock: ChatRoom = {
      users: {
        [carrotId]: deleteField(),
      },
      blockedUsers: arrayRemove(guavaId),
    };
    await assertFails(
      setDoc(
        doc(carrotDb, getRoomPath(appleGroupId)),
        appleGroupUpdateRemoveBlock,
        {
          merge: true,
        }
      )
    );
  });
  it("[Fail] Join open room when user is blocked", async () => {
    const appleGroupUpdate: ChatRoom = {
      open: true,
      blockedUsers: arrayUnion(guavaId),
    };
    await setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
      merge: true,
    });
    const appleGroupUpdateBlock: ChatRoom = {
      users: {
        [guavaId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdateBlock, {
        merge: true,
      })
    );
  });
  it("[Fail] Join open room when user is blocked (2)", async () => {
    const appleGroupUpdate: ChatRoom = {
      open: true,
      blockedUsers: arrayUnion(guavaId),
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
    const appleGroupUpdateBlock: ChatRoom = {
      users: {
        [guavaId]: {
          nMC: 0,
        },
      },
      blockedUsers: arrayRemove(guavaId),
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdateBlock, {
        merge: true,
      })
    );
  });
  it("[Fail] Accept invitation and join room when user is blocked", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
      blockedUsers: arrayUnion(guavaId),
    };
    await setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
      merge: true,
    });
    const appleGroupUpdateBlock: ChatRoom = {
      users: {
        [guavaId]: {
          nMC: 0,
        },
      },
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdateBlock, {
        merge: true,
      })
    );
  });
  it("[Fail] Accept invitation and join room when user is blocked (2)", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
      blockedUsers: arrayUnion(guavaId),
    };
    await setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
      merge: true,
    });
    const appleGroupUpdateBlock: ChatRoom = {
      users: {
        [guavaId]: {
          nMC: 0,
        },
      },
      blockedUsers: arrayRemove(guavaId),
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdateBlock, {
        merge: true,
      })
    );
  });
  it("[Fail] Accept invitation and join room when user is blocked (3)", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
      blockedUsers: arrayUnion(guavaId),
    };
    await setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
      merge: true,
    });
    const appleGroupUpdateBlock: ChatRoom = {
      users: {
        [guavaId]: {
          nMC: 0,
        },
      },
      invitedUsers: arrayRemove(guavaId),
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdateBlock, {
        merge: true,
      })
    );
  });
  it("[Fail] Accept invitation and join room when user is blocked (4)", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
      blockedUsers: arrayUnion(guavaId),
    };
    await setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
      merge: true,
    });
    const appleGroupUpdateBlock: ChatRoom = {
      users: {
        [guavaId]: {
          nMC: 0,
        },
      },
      blockedUsers: arrayRemove(guavaId),
      invitedUsers: arrayRemove(guavaId),
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdateBlock, {
        merge: true,
      })
    );
  });
});

describe("Try To Updated Created at", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    group: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
      [durianId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
    rejectedUsers: [flowerId],
    createdAt: 1312,
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });
  it("[Fail] Master updated created at", async () => {
    const appleGroupUpdate: ChatRoom = {
      createdAt: 10000,
    };
    await assertFails(
      setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Pass] Master added created at", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const appleUpdate = {
        createdAt: deleteField(),
      };
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleUpdate,
        {
          merge: true,
        }
      );
    });
    const appleGroupUpdate: ChatRoom = {
      createdAt: 10000,
    };
    await assertSucceeds(
      setDoc(doc(appleDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member added created at", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const appleUpdate = {
        createdAt: deleteField(),
      };
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleUpdate,
        {
          merge: true,
        }
      );
    });
    const appleGroupUpdate: ChatRoom = {
      createdAt: 10000,
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] outsider added created at", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const appleUpdate = {
        createdAt: deleteField(),
      };
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleUpdate,
        {
          merge: true,
        }
      );
    });
    const appleGroupUpdate: ChatRoom = {
      createdAt: 10000,
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Member updated created at", async () => {
    const appleGroupUpdate: ChatRoom = {
      createdAt: 10000,
    };
    await assertFails(
      setDoc(doc(carrotDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider updated created at", async () => {
    const appleGroupUpdate: ChatRoom = {
      createdAt: 10000,
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Pass] Create group room with updated at", async () => {
    const bananaGroupCreate: ChatRoom = {
      createdAt: 10000,
      name: "banana group",
      group: true,
      masterUsers: [bananaId],
      users: {
        [bananaId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, getRoomPath(generateRandomId())),
        bananaGroupCreate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Pass] Create single room with updated at", async () => {
    const bananaGroupCreate: ChatRoom = {
      createdAt: 10000,
      name: "banana group",
      single: true,
      masterUsers: [bananaId],
      users: {
        [bananaId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, getRoomPath(generateRandomId())),
        bananaGroupCreate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Pass] Create single room without updated at", async () => {
    const bananaGroupCreate: ChatRoom = {
      name: "banana group",
      single: true,
      masterUsers: [bananaId],
      users: {
        [bananaId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, getRoomPath(generateRandomId())),
        bananaGroupCreate,
        {
          merge: true,
        }
      )
    );
  });
  it("[Pass] Create group room without updated at", async () => {
    const bananaGroupCreate: ChatRoom = {
      name: "banana group",
      group: true,
      masterUsers: [bananaId],
      users: {
        [bananaId]: {
          nMC: 0,
        },
      },
    };
    await assertSucceeds(
      setDoc(
        doc(bananaDb, getRoomPath(generateRandomId())),
        bananaGroupCreate,
        {
          merge: true,
        }
      )
    );
  });
});

describe("Members inviting other user when allMembersCanInvite is true", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    group: true,
    allMembersCanInvite: true,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
      [durianId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
    rejectedUsers: [flowerId],
    createdAt: 1312,
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });
  it("[Pass] Member invited other user", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
    };
    await assertSucceeds(
      setDoc(doc(durianDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider invited himself", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

describe("Members inviting other user when allMembersCanInvite is false", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    group: true,
    allMembersCanInvite: false,
    masterUsers: [appleId, bananaId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
      [carrotId]: {
        nMC: 0,
      },
      [durianId]: {
        nMC: 0,
      },
    },
    invitedUsers: [eggPlantId],
    rejectedUsers: [flowerId],
    createdAt: 1312,
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });
  it("[Fail] Member invited other user", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
    };
    await assertFails(
      setDoc(doc(durianDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider invited himself", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

describe("Members inviting other user when allMembersCanInvite is true, Single chat", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    single: true,
    allMembersCanInvite: true,
    masterUsers: [appleId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
    },
    createdAt: 1312,
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });
  it("[Fail] Member invited other user", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
    };
    await assertFails(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider invited himself", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

describe("Members inviting other user when allMembersCanInvite is true, Open chat", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    group: true,
    open: true,
    allMembersCanInvite: true,
    masterUsers: [appleId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
    },
    createdAt: 1312,
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });
  it("[Pass] Master invited other user", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
    };
    await assertSucceeds(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Pass] Member invited other user", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
    };
    await assertSucceeds(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider invited himself", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});

describe("Members inviting other user when allMembersCanInvite is false, Open chat", async () => {
  const appleGroup: ChatRoom = {
    name: "apple group",
    open: true,
    group: true,
    allMembersCanInvite: true,
    masterUsers: [appleId],
    users: {
      [appleId]: {
        nMC: 0,
      },
      [bananaId]: {
        nMC: 0,
      },
    },
    createdAt: 1312,
  };
  let appleGroupId: string = "apple-group-id";
  before(async () => {
    setLogLevel("error");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });
  beforeEach(async () => {
    await clearAndResetFirestoreContext();

    // Create the apple's group for each test
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), getRoomPath(appleGroupId)),
        appleGroup
      );
    });
  });
  it("[Pass] Master invited other user", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
    };
    await assertSucceeds(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Pass] Member invited other user (it doesn't matter since it is open)", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
    };
    await assertSucceeds(
      setDoc(doc(bananaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
  it("[Fail] Outsider invited himself", async () => {
    const appleGroupUpdate: ChatRoom = {
      invitedUsers: arrayUnion(guavaId),
    };
    await assertFails(
      setDoc(doc(guavaDb, getRoomPath(appleGroupId)), appleGroupUpdate, {
        merge: true,
      })
    );
  });
});
