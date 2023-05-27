// Function to handle changes in Chrome's sync storage
export async function handleStorageChanges(changes) {
    for (let key in changes) {
        let storageChange = changes[key];
        //Log the change
        console.log(key, storageChange.oldValue, storageChange.newValue);
    }
}