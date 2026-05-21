import { create } from 'zustand'

type LastViewedPhotoState = {
  photoToScrollTo: number | null
  setPhotoToScrollTo: (photoToScrollTo: number | null) => void
}

const useLastViewedPhotoStore = create<LastViewedPhotoState>((set) => ({
  photoToScrollTo: null,
  setPhotoToScrollTo: (photoToScrollTo) => set({ photoToScrollTo }),
}))

export const useLastViewedPhoto = () =>
  [
    useLastViewedPhotoStore((s) => s.photoToScrollTo),
    useLastViewedPhotoStore((s) => s.setPhotoToScrollTo),
  ] as const
