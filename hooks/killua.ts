import * as CryptoJS from "crypto-js";
import { useEffect, useState } from "react";
import { ThunderType } from "../types/thunder.type";

function useKillua<T>(
  args: ThunderType
): [T, (value: T | ((value: T) => T)) => void, Boolean] {
  // for genrate uniqe browser id for encrypt key
  function uniqeBrowserId(): string {
    const browserInfo =
      window.navigator.userAgent.match(
        /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i
      ) || [];
    const browserName = browserInfo[1].toLowerCase();
    const browserVersion = browserInfo[2];
    return `${browserName}${browserVersion}${window.navigator.userAgent}`;
  }

  // for get thunder value from localstorage
  function getThunderFromLocalstorage(): string {
    let parsedValue = args.default;
    const localStorageValue = localStorage.getItem(args.key);
    if (localStorageValue) {
      try {
        parsedValue = JSON.parse(
          args.encrypt
            ? CryptoJS.AES.decrypt(
                localStorageValue,
                uniqeBrowserId()
              ).toString(CryptoJS.enc.Utf8)
            : localStorageValue
        );
      } catch {
        localStorage.removeItem(args.key);
      }
    }
    return parsedValue;
  }

  // for set expire time
  useEffect(() => {
    // check if 'thunderExpire' exists in localStorage and decrypt it, or set it to null if decryption fails
    const thunderExpireLocalstorage = (): null | string => {
      let parsedValue = null;
      const localStorageValue = localStorage.getItem('thunderExpire');
      if (localStorageValue) {
        try {
          parsedValue = JSON.parse(
            args.encrypt
              ? CryptoJS.AES.decrypt(
                  localStorageValue,
                  uniqeBrowserId()
                ).toString(CryptoJS.enc.Utf8)
              : localStorageValue
          );
        } catch {
          localStorage.removeItem(args.key);
        }
      }
      return parsedValue;
    };

    // check if 'thunderExpire' in localStorage
    if (!thunderExpireLocalstorage()) {
      // create 'thunderExpire' with an empty object encrypted
      localStorage.setItem(
        "thunderExpire",
        CryptoJS.AES.encrypt(JSON.stringify({}), uniqeBrowserId()).toString()
      );
      // delete all localStorage keys starting with 'thunder'
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("thunder") && key !== "thunderExpire") {
          localStorage.removeItem(key);
        }
      }
    }
    // check if 'args.key' is not in 'thunderExpireLocalstorage' && push it to 'thunderExpireLocalstorage'
    if (thunderExpireLocalstorage() && !Object(thunderExpireLocalstorage())[args.key]) {
      Object(thunderExpireLocalstorage())[args.key] =
        args.expire === null ? null : Date.now() + args.expire * 60 * 1000;
      localStorage.setItem(
        "thunderExpire",
        CryptoJS.AES.encrypt(JSON.stringify(thunderExpireLocalstorage()), uniqeBrowserId()).toString()
      );
    }
    // check expire time for 'args.key' and remove it from localStorage and 'thunderExpire' if expired
    if (thunderExpireLocalstorage() && Object(thunderExpireLocalstorage())[args.key] !== null) {
      if (Date.now() > Object(thunderExpireLocalstorage())[args.key]) {
        localStorage.removeItem(args.key);
        delete Object(thunderExpireLocalstorage())[args.key];
        localStorage.setItem(
          "thunderExpire",
          CryptoJS.AES.encrypt(JSON.stringify(thunderExpireLocalstorage()), uniqeBrowserId()).toString()
        );
      }
    }
  }, [args.key]);

  // get thunder value from localstorage (initial value)
  const [thunder, setThunder] = useState<any>(
    typeof window !== undefined ? undefined : getThunderFromLocalstorage()
  );
  useEffect((): void => {
    if (thunder === undefined) {
      setThunder(getThunderFromLocalstorage());
    }
  }, []);

  // get updated thunder value from localstorage and set to thunderState (call after update localstorage value)
  useEffect((): (() => void) => {
    const getUpdatedThunderFromLocalstorage = (): void => {
      const localstorageValue = getThunderFromLocalstorage();
      if (localstorageValue !== thunder) {
        setThunder(localstorageValue);
      }
    };
    window.addEventListener("storage", (e: StorageEvent) => {
      getUpdatedThunderFromLocalstorage();
    });
    return (): void => {
      window.removeEventListener("storage", (e: StorageEvent) => {
        getUpdatedThunderFromLocalstorage();
      });
    };
  }, []);

  // set thunder value to localstorage (call after update thunder state)
  useEffect((): void => {
    if (thunder !== undefined) {
      localStorage.setItem(
        args.key,
        args.encrypt
          ? CryptoJS.AES.encrypt(JSON.stringify(thunder), uniqeBrowserId())
          : thunder
      );
      window.dispatchEvent(new Event("storage"));
    }
  }, [thunder]);

  // returned [thunder, setThunder function, thunderStateIsReady]
  return [
    thunder,
    (value: any) => {
      if (typeof value === "function") {
        setThunder((prev: any) => value(prev));
      } else {
        setThunder(value);
      }
    },
    thunder === undefined ? false : true,
  ];
}

export default useKillua;
