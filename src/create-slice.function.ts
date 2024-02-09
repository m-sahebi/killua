import { errorMessages } from './constants/error-messages.constant';
import {
  TConfig,
  TDefaultServer,
  TReducers,
  TSelectors
} from './types/config.type';
import { errorTemplate } from './utils/other/error-template.utli';
import { sliceConfigReducers } from './utils/other/slice-config-reducers.util';
import { sliceConfigSelectors } from './utils/other/slice-config-selectors.util';
import {
  isBoolean,
  isEmptyObject,
  isEmptyString,
  isFunction,
  isObject,
  isString,
  isUndefined
} from './utils/other/type-guards.util';
import {
  URemoveNeverProperties,
  URemoveValueFromParam
} from './utils/other/utility-types.util';
import { getSliceFromStorage } from './utils/slice-set-and-get/get-slice-from-storage.util';
import { getSliceValue } from './utils/slice-set-and-get/get-slice-value.util';
import { setSliceToStorage } from './utils/slice-set-and-get/set-slice-to-storage.util';

type TReturn<
  GSlice,
  GDefaultServer extends TDefaultServer<GSlice>,
  GSelectors extends TSelectors<GSlice>,
  GReducers extends TReducers<GSlice>
> = URemoveNeverProperties<{
  config: TConfig<GSlice, GDefaultServer, GSelectors, GReducers>;
  get: () => GSlice;
  set: (value: GSlice | ((value: GSlice) => GSlice)) => void;
  selectors: undefined extends GSelectors
    ? never
    : {
        [K in keyof GSelectors]: URemoveValueFromParam<GSlice, GSelectors[K]>;
      };
  reducers: undefined extends GReducers
    ? never
    : {
        [K in keyof GReducers]: URemoveValueFromParam<GSlice, GReducers[K]>;
      };
}>;

export default function createSlice<
  GSlice,
  GDefaultServer extends TDefaultServer<GSlice>,
  GSelectors extends TSelectors<GSlice>,
  GReducers extends TReducers<GSlice>
>(
  params: TConfig<GSlice, GDefaultServer, GSelectors, GReducers>
): TReturn<GSlice, GDefaultServer, GSelectors, GReducers> {
  // validate `defaultClient`
  if (isUndefined(params.defaultClient)) {
    errorTemplate({
      msg: errorMessages.defaultClient.required,
      key: params.key
    });
  }

  // validate `defaultServer`
  if (!isUndefined(params.defaultServer)) {
    if (typeof params.defaultClient !== typeof params.defaultServer) {
      errorTemplate({
        msg: errorMessages.defaultServer.invalidType,
        key: params.key
      });
    }
  }

  // validate `key`
  if (isUndefined(params.key)) {
    errorTemplate({
      msg: errorMessages.key.required,
      key: params.key
    });
  } else if (!isString(params.key)) {
    errorTemplate({
      msg: errorMessages.key.invalidType,
      key: params.key
    });
  } else if (isEmptyString(params.key)) {
    errorTemplate({
      msg: errorMessages.key.empty,
      key: params.key
    });
  } else if ((params.key as string).startsWith('slice-')) {
    errorTemplate({
      msg: errorMessages.key.startWithSlice,
      key: params.key
    });
  } else if ((params.key as string).startsWith('slices-')) {
    errorTemplate({
      msg: errorMessages.key.startWithSlices,
      key: params.key
    });
  }

  // validate `encrypt`
  if (!isUndefined(params.encrypt) && !isBoolean(params.encrypt)) {
    errorTemplate({
      msg: errorMessages.encrypt.invalidType,
      key: params.key
    });
  }

  // validate `expire`
  if (
    !isUndefined(params.expire) &&
    !/^\d+d-(?:[0-1]?\d|2[0-3])[hH]-[0-5]?\d[mM]-[0-5]?\d[sS]$/.test(
      params.expire
    )
  ) {
    errorTemplate({
      msg: errorMessages.expire.invalidFormat,
      key: params.key
    });
  }

  // validate `reducers`
  if (!isUndefined(params.reducers)) {
    if (!isObject(params.reducers)) {
      errorTemplate({
        msg: errorMessages.reducers.invalidType,
        key: params.key
      });
    } else if (isEmptyObject(params.reducers)) {
      errorTemplate({
        msg: errorMessages.reducers.empty,
        key: params.key
      });
    } else if (
      Object.keys(params.reducers).some(
        (key): boolean => !isFunction(params.reducers![key])
      )
    ) {
      errorTemplate({
        msg: errorMessages.reducers.keysValueIsNotFunction,
        key: params.key
      });
    }
  }

  // validate `selectors`
  if (!isUndefined(params.selectors)) {
    if (!isObject(params.selectors)) {
      errorTemplate({
        msg: errorMessages.selectors.invalidType,
        key: params.key
      });
    } else if (isEmptyObject(params.selectors)) {
      errorTemplate({
        msg: errorMessages.selectors.empty,
        key: params.key
      });
    } else if (
      Object.keys(params.selectors).some(
        (key): boolean => !isFunction(params.selectors![key])
      )
    ) {
      errorTemplate({
        msg: errorMessages.selectors.keysValueIsNotFunction,
        key: params.key
      });
    }
  }

  // validate `schema`
  if (!isUndefined(params.schema)) {
    if (
      !('parse' in Object(params.schema)) &&
      !('validateSync' in Object(params.schema))
    ) {
      errorTemplate({
        msg: errorMessages.schema.invalidType,
        key: params.key
      });
    }
  }

  // validate other keys
  const validKeys = new Set([
    'defaultClient',
    'defaultServer',
    'key',
    'encrypt',
    'expire',
    'schema',
    'reducers',
    'selectors'
  ]);
  const notDefinedSliceKey = Object.keys(params).filter(
    key => !validKeys.has(key)
  );
  if (notDefinedSliceKey.length > 0) {
    errorTemplate({
      msg: errorMessages.other.notDefined(notDefinedSliceKey),
      key: params.key
    });
  }

  return {
    config: params,
    get: getSliceValue({ config: params }),
    set: (value: GSlice | ((value: GSlice) => GSlice)) => {
      setSliceToStorage({
        config: params,
        slice:
          value instanceof Function
            ? value(getSliceFromStorage({ config: params }))
            : value
      });
    },
    reducers: sliceConfigReducers({ config: params }),
    selectors: sliceConfigSelectors({ config: params })
  } as any;
}
