import {
  TConfig,
  TDefaultServer,
  TReducers,
  TSelectors
} from '../../types/config.type';
import { getSliceFromStorage } from '../slice-set-and-get/get-slice-from-storage.util';

export function sliceConfigSelectors<
  GSlice,
  GDefaultServer extends TDefaultServer<GSlice>,
  GSelectors extends TSelectors<GSlice>,
  GReducers extends TReducers<GSlice>
>(params: {
  config: TConfig<GSlice, GDefaultServer, GSelectors, GReducers>;
}): Record<string, (payload?: any) => any> {
  // params.config.selectors is truthy ===> assign slice config selectors to selectors object
  const selectors: Record<string, (payload?: any) => any> = {};
  if (params.config.selectors!) {
    for (const selectorName in params.config.selectors!) {
      if (
        Object.prototype.hasOwnProperty.call(
          params.config.selectors!,
          selectorName
        )
      ) {
        const selectorFunc = params.config.selectors[selectorName];
        selectors[selectorName] = (payload?: any) => {
          return selectorFunc(
            getSliceFromStorage({ config: params.config }),
            payload
          );
        };
      }
    }
  }
  return selectors;
}
