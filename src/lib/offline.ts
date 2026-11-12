const databaseName = "synaptiquiz-offline";
const databaseVersion = 1;
const snapshotStore = "snapshots";
const answerStore = "answer-outbox";
const currentUserKey = "synaptiquiz-current-user";

export type PendingAnswer = {
  clientEventId: string;
  gameId: string;
  gameQuestionId: string;
  playerId: string;
  selectedOptionId: string;
  createdAt: number;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Offline storage is unavailable in this browser."));
      return;
    }
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(snapshotStore)) {
        database.createObjectStore(snapshotStore, { keyPath: "userId" });
      }
      if (!database.objectStoreNames.contains(answerStore)) {
        database.createObjectStore(answerStore, { keyPath: "clientEventId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage."));
  });
}

export async function saveSnapshot(userId: string, snapshot: unknown) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(snapshotStore, "readwrite");
    transaction.objectStore(snapshotStore).put({ userId, snapshot, updatedAt: Date.now() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not cache app data."));
  });
  localStorage.setItem(currentUserKey, userId);
  database.close();
}

export async function clearCachedSnapshot(userId: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(snapshotStore, "readwrite");
    transaction.objectStore(snapshotStore).delete(userId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear cached app data."));
  });
  if (localStorage.getItem(currentUserKey) === userId) localStorage.removeItem(currentUserKey);
  database.close();
}

export async function loadLastSnapshot<T>() {
  const userId = localStorage.getItem(currentUserKey);
  if (!userId) return null;
  const database = await openDatabase();
  const snapshot = await new Promise<T | null>((resolve, reject) => {
    const request = database.transaction(snapshotStore).objectStore(snapshotStore).get(userId);
    request.onsuccess = () => resolve((request.result?.snapshot as T | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not load cached app data."));
  });
  database.close();
  return snapshot;
}

export async function queueAnswer(answer: PendingAnswer) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(answerStore, "readwrite");
    transaction.objectStore(answerStore).put(answer);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save your offline answer."));
  });
  database.close();
}

export async function getQueuedAnswers() {
  const database = await openDatabase();
  const answers = await new Promise<PendingAnswer[]>((resolve, reject) => {
    const request = database.transaction(answerStore).objectStore(answerStore).getAll();
    request.onsuccess = () => resolve((request.result as PendingAnswer[]).sort((a, b) => a.createdAt - b.createdAt));
    request.onerror = () => reject(request.error ?? new Error("Could not read queued answers."));
  });
  database.close();
  return answers;
}

export async function removeQueuedAnswer(clientEventId: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(answerStore, "readwrite");
    transaction.objectStore(answerStore).delete(clientEventId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear synced answer."));
  });
  database.close();
}