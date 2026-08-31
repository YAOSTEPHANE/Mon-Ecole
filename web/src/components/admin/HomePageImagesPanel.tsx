'use client';

import { useMemo } from 'react';
import Button from '../ui/Button';
import { FiEye, FiEyeOff, FiLoader, FiTrash2, FiUpload } from 'react-icons/fi';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { adminApi } from '@/services/api';
import toast from 'react-hot-toast';
import {
  HOME_PAGE_IMAGE_DEFINITIONS,
  HOME_PAGE_IMAGE_HIDDEN,
  type HomePageImageSlot,
} from '@/lib/homePageImages.types';
import { resolveHomePageImageSrc } from '@/lib/homePageImages';

type Props = {
  uploadingSlot: string | null;
  onUploadStart: (slot: string) => void;
  onUploadEnd: () => void;
};

export default function HomePageImagesPanel({ uploadingSlot, onUploadStart, onUploadEnd }: Props) {
  const { branding, refreshBranding } = useAppBranding();

  const groups = useMemo(() => {
    const map = new Map<string, typeof HOME_PAGE_IMAGE_DEFINITIONS>();
    for (const def of HOME_PAGE_IMAGE_DEFINITIONS) {
      const list = map.get(def.group) ?? [];
      list.push(def);
      map.set(def.group, list);
    }
    return [...map.entries()];
  }, []);

  const triggerUpload = (slot: HomePageImageSlot) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Fichier trop volumineux (max 5 Mo)');
        return;
      }
      onUploadStart(slot);
      try {
        await adminApi.uploadAppBrandingFile(slot, file);
        await refreshBranding();
        toast.success('Image de la page d’accueil mise à jour');
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } } };
        toast.error(err?.response?.data?.error || 'Échec de l’envoi');
      } finally {
        onUploadEnd();
      }
    };
    input.click();
  };

  const clearImage = async (slot: HomePageImageSlot) => {
    onUploadStart(slot);
    try {
      await adminApi.updateAppBranding({
        homePageImages: { [slot]: null },
      });
      await refreshBranding();
      toast.success('Image réinitialisée (modèle par défaut)');
    } catch {
      toast.error('Impossible de réinitialiser');
    } finally {
      onUploadEnd();
    }
  };

  const hideImage = async (slot: HomePageImageSlot) => {
    onUploadStart(slot);
    try {
      await adminApi.updateAppBranding({
        homePageImages: { [slot]: HOME_PAGE_IMAGE_HIDDEN },
      });
      await refreshBranding();
      toast.success('Image masquée sur la page publique');
    } catch {
      toast.error('Impossible de masquer');
    } finally {
      onUploadEnd();
    }
  };

  return (
    <div className="space-y-6">
      {groups.map(([group, defs]) => (
        <div key={group}>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{group}</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {defs.map((def) => {
              const { src, isCustom, isHidden } = resolveHomePageImageSrc(
                branding.homePageImages,
                def.slot,
                def.defaultPath,
              );
              const busy = uploadingSlot === def.slot;
              return (
                <div
                  key={def.slot}
                  className="flex flex-col gap-3 rounded-xl border-2 border-amber-200/80 bg-amber-50/50 p-4 sm:flex-row sm:items-start"
                >
                  <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg border border-amber-200 bg-white sm:h-20 sm:w-32">
                    {isHidden || !src ? (
                      <div className="flex h-full w-full items-center justify-center bg-stone-100 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                        Masquée
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{def.label}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{def.hint}</p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {isHidden
                        ? 'Masquée sur le site public'
                        : isCustom
                          ? 'Image personnalisée'
                          : 'Image par défaut du site'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => triggerUpload(def.slot)}
                        disabled={!!uploadingSlot}
                      >
                        {busy ? (
                          <FiLoader className="h-4 w-4 animate-spin" />
                        ) : (
                          <FiUpload className="h-4 w-4" />
                        )}
                        <span className="ml-1.5">{isCustom || isHidden ? 'Changer' : 'Ajouter'}</span>
                      </Button>
                      {def.hideable && !isHidden ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => hideImage(def.slot)}
                          disabled={!!uploadingSlot}
                          title="Masquer sur la page publique"
                        >
                          <FiEyeOff className="h-4 w-4" />
                          <span className="ml-1.5">Masquer</span>
                        </Button>
                      ) : null}
                      {def.hideable && isHidden ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => clearImage(def.slot)}
                          disabled={!!uploadingSlot}
                          title="Réafficher le modèle par défaut"
                        >
                          <FiEye className="h-4 w-4" />
                          <span className="ml-1.5">Réafficher</span>
                        </Button>
                      ) : null}
                      {isCustom && !isHidden ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => clearImage(def.slot)}
                          disabled={!!uploadingSlot}
                          title="Revenir au modèle par défaut"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
