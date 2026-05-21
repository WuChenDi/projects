'use client'

import { IKPageContainer } from '@cdlab996/ui/IK/IKPageContainer'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import type { ImageProps } from '@/utils/types'
import { useLastViewedPhoto } from '@/utils/useLastViewedPhoto'
import Bridge from './Icons/Bridge'
import Modal from './Modal'

export default function Gallery({ images }: { images: ImageProps[] }) {
  const searchParams = useSearchParams()
  const photoAssetId = searchParams.get('photoId')
  const [lastViewedAssetId, setLastViewedAssetId] = useLastViewedPhoto()

  const lastViewedPhotoRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (lastViewedAssetId && !photoAssetId) {
      lastViewedPhotoRef.current?.scrollIntoView({ block: 'center' })
      setLastViewedAssetId(null)
    }
  }, [photoAssetId, lastViewedAssetId, setLastViewedAssetId])

  const modalPhotoExists =
    photoAssetId !== null && images.some((img) => img.asset_id === photoAssetId)

  return (
    <>
      <IKPageContainer
        scrollable={false}
        className="block mx-auto w-full max-w-[1960px] p-4"
      >
        {modalPhotoExists && photoAssetId && (
          <Modal
            images={images}
            photoAssetId={photoAssetId}
            onClose={() => {
              setLastViewedAssetId(photoAssetId)
            }}
          />
        )}
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
          <div className="after:content relative mb-5 flex h-[629px] flex-col items-center justify-end gap-4 overflow-hidden rounded-lg bg-white/10 px-6 pb-16 pt-64 text-center text-white shadow-highlight after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight lg:pt-0">
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <span className="flex max-h-full max-w-full items-center justify-center">
                <Bridge />
              </span>
              <span className="absolute left-0 right-0 bottom-0 h-[400px] bg-gradient-to-b from-black/0 via-black to-black"></span>
            </div>
            <Image
              alt="Byshot logo"
              className="transform rounded-lg brightness-90 transition will-change-auto group-hover:brightness-110"
              style={{ transform: 'translate3d(0, 0, 0)' }}
              src="https://wcd.pages.dev/logo.png"
              width={150}
              height={150}
              sizes="(max-width: 640px) 100vw,
                  (max-width: 1280px) 50vw,
                  (max-width: 1536px) 33vw,
                  25vw"
            />
            <h1 className="mt-8 mb-4 text-base font-bold uppercase tracking-widest">
              Personal Photography Collection
            </h1>
            <p className="max-w-[40ch] text-white/75 sm:max-w-[32ch]">
              A curated collection of moments captured through my lens
            </p>
            <a
              className="pointer z-10 mt-6 rounded-lg border border-white bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-white/10 hover:text-white md:mt-4"
              href="https://wcd.pages.dev/"
              target="_blank"
              rel="noreferrer"
            >
              Notes
            </a>
          </div>
          {images.map(({ id, asset_id, public_id, format, blurDataUrl }) => (
            <Link
              key={asset_id}
              href={`/?photoId=${asset_id}`}
              ref={asset_id === lastViewedAssetId ? lastViewedPhotoRef : null}
              scroll={false}
              className="after:content group relative mb-5 block w-full cursor-zoom-in after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight"
            >
              <Image
                alt={`Photo ${id + 1} from the collection`}
                className="transform rounded-lg brightness-90 transition will-change-auto group-hover:brightness-110"
                style={{ transform: 'translate3d(0, 0, 0)' }}
                {...(blurDataUrl
                  ? { placeholder: 'blur', blurDataURL: blurDataUrl }
                  : {})}
                src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_scale,w_720/${public_id}.${format}`}
                width={720}
                height={480}
                sizes="(max-width: 640px) 100vw,
                  (max-width: 1280px) 50vw,
                  (max-width: 1536px) 33vw,
                  25vw"
              />
            </Link>
          ))}
        </div>
      </IKPageContainer>
      <footer className="p-6 text-center text-white/80 sm:p-12">
        Copyright (c) 2023-PRESENT |{' '}
        <a
          href="https://github.com/WuChenDi"
          target="_blank"
          className="font-semibold hover:text-white"
          rel="noreferrer"
        >
          wudi
        </a>
      </footer>
    </>
  )
}
