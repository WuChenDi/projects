import { create } from 'zustand'

type LastViewedPhotoState = {
  lastViewedAssetId: string | null
  setLastViewedAssetId: (assetId: string | null) => void
}

const useLastViewedPhotoStore = create<LastViewedPhotoState>((set) => ({
  lastViewedAssetId: null,
  setLastViewedAssetId: (lastViewedAssetId) => set({ lastViewedAssetId }),
}))

export const useLastViewedPhoto = () =>
  [
    useLastViewedPhotoStore((s) => s.lastViewedAssetId),
    useLastViewedPhotoStore((s) => s.setLastViewedAssetId),
  ] as const
