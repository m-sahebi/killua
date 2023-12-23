import { useEffect, useState } from 'react';
import getSliceFromStorage from './utils/slice-set-and-get/get-slice-from-storage.util';
import defaultSliceValue from './utils/other/default-slice-value.util';
import { TConfig } from './types/config.type';
import setSliceToStorage from './utils/slice-set-and-get/set-slice-to-storage.util';
import errorTemplate from './utils/other/error-template.utli';
import isClientSide from './utils/other/is-client-side.util';
import { getSliceExpireTimestampFromStorage } from './utils/slice-expire-timer/get-slice-expire-timestamp-from-storage.util';
import broadcastEvents from './utils/other/broadcast-events.util';
import { broadcastChannelMessages } from './constants/broadcast-channel-messages.constant';
import { errorMessages } from './constants/error-messages.constant';
import generateSliceConfigChecksum from './utils/detect-slice-config-change/generate-slice-config-checksum.util';
import { getSliceConfigChecksumFromStorage } from './utils/detect-slice-config-change/get-slice-config-checksum-from-storage.util';

export default function useKillua<TSlice>(params: TConfig<TSlice>): {
  get: TSlice;
  set: (value: TSlice | ((value: TSlice) => TSlice)) => void;
  reducers: Record<string, Function>;
  selectors: Record<string, Function>;
  isReady: boolean;
} {
  // default value slice
  const defaultValueSlice: Record<'server' | 'client', TSlice> = {
    server: defaultSliceValue({
      config: params,
      type: 'server',
    }),
    client: defaultSliceValue({
      config: params,
      type: 'client',
    }),
  };

  // params.ssr is truthy ===> default `isReady` value is `false` and set to `true` in client-side in return (only for `ssr: true`)
  const [isReady, setIsReady] = useState(params.ssr ? false : true);

  // params.ssr is truthy ===> return `params.defaultServer`
  // params.ssr is falsy ===> return slice value from storage
  const [sliceState, setSliceState] = useState((): TSlice => {
    if (params.ssr) {
      return defaultValueSlice.server;
    } else {
      // `params.ssr` is `false` and application is server-side ===> throw error
      if (!isClientSide()) {
        errorTemplate({
          msg: errorMessages.ssr.mustBeTrue,
          key: params.key,
        });
      }
      // `params.ssr` is `false` and application is client-side ===> return slice value from storage
      return getSliceFromStorage({ config: params });
    }
  });

  // is-changed slice config by developer ===> call broadcast channel event `broadcastChannelMessages.storageValueNotValid`
  useEffect((): void => {
    const sliceConfigChecksumFromStorage = getSliceConfigChecksumFromStorage({
      config: params,
    });
    const currentSliceConfigChecksum = generateSliceConfigChecksum({
      config: params,
    });
    if (sliceConfigChecksumFromStorage !== currentSliceConfigChecksum) {
      new BroadcastChannel('killua').postMessage({
        type: broadcastChannelMessages.storageValueNotValid,
        key: params.key,
      });
    }
  }, []);

  // params.expire is truthy ===> check slice expire timestamp
  useEffect((): (() => void) => {
    const broadcastChannel = new BroadcastChannel('killua');
    let intervalId: any = null;
    if (params.expire) {
      const sliceExpireTimestamp = getSliceExpireTimestampFromStorage({
        config: params,
      });
      if (Number(sliceExpireTimestamp) < Date.now()) {
        broadcastChannel.postMessage({
          type: broadcastChannelMessages.sliceEventOnExpire,
          key: params.key,
          value: sliceState,
        });
      } else {
        intervalId = setInterval(
          (): void => {
            if (Number(sliceExpireTimestamp) < Date.now()) {
              broadcastChannel.postMessage({
                type: broadcastChannelMessages.sliceEventOnExpire,
                key: params.key,
                value: sliceState,
              });
            }
          },
          Number(sliceExpireTimestamp) - Date.now(),
        );
      }
    }
    return (): void => {
      clearInterval(intervalId);
    };
  }, [sliceState]);

  // params.ssr && !isReady ===> set `isReady` to `true` | get slice from storage and set to `sliceState`
  useEffect((): void => {
    if (params.ssr && !isReady) {
      setIsReady(true);
      setSliceState(getSliceFromStorage({ config: params }));
    }
  }, [sliceState]);

  // broadcast channel events
  useEffect((): void => {
    broadcastEvents({
      config: params,
      sliceState,
      setSliceState,
    });
  }, []);

  // params.selectors is truthy ===> assign slice config selectors to selectors object
  const selectors: Record<string, Function> = {};
  if (params.selectors) {
    for (const selectorName in params.selectors) {
      if (
        Object.prototype.hasOwnProperty.call(params.selectors, selectorName)
      ) {
        const selectorFunc = params.selectors[selectorName];
        selectors[selectorName] = (payload: any) => {
          return selectorFunc(sliceState, payload);
        };
      }
    }
  }

  // params.reducers is truthy ===> assign slice config reducers to reducers object
  const reducers: Record<string, Function> = {};
  if (params.reducers) {
    for (const reducerName in params.reducers) {
      if (Object.prototype.hasOwnProperty.call(params.reducers, reducerName)) {
        const reducerFunc = params.reducers[reducerName];
        reducers[reducerName] = (payload: any) => {
          setSliceToStorage({
            config: params,
            slice: reducerFunc(sliceState, payload),
          });
        };
      }
    }
  }

  return {
    get: sliceState,
    set: (value: TSlice | ((value: TSlice) => TSlice)) => {
      setSliceToStorage({
        config: params,
        slice: value instanceof Function ? value(sliceState) : value,
      });
    },
    reducers,
    selectors,
    isReady,
  };
}
