import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

/**
 * A laptop built in CSS around a real screenshot of the product.
 * Everything is sized in percentages so the device scales as one piece.
 */
export function Laptop({ src, alt, priority = false, sizes = "(min-width: 1024px) 640px, 100vw", className = "" }: Props) {
  return (
    <figure className={`relative w-full ${className}`}>
      {/* Lid */}
      <div className="relative mx-auto w-[88%] rounded-t-[10px] bg-linear-to-b from-zinc-700 to-zinc-900 p-[1.6%] pb-[1.2%] shadow-device sm:rounded-t-[16px]">
        <span aria-hidden className="absolute left-1/2 top-[0.5%] size-[3px] -translate-x-1/2 rounded-full bg-zinc-600 sm:size-1" />
        <div className="overflow-hidden rounded-[3px] bg-white sm:rounded-[5px]">
          <Image
            src={src}
            alt={alt}
            width={1600}
            height={1000}
            priority={priority}
            sizes={sizes}
            className="block h-auto w-full"
          />
        </div>
      </div>
      {/* Base */}
      <div className="relative h-2 w-full rounded-b-[14px] bg-linear-to-b from-zinc-200 via-zinc-300 to-zinc-400 sm:h-3">
        <span
          aria-hidden
          className="absolute left-1/2 top-0 h-[3px] w-[14%] -translate-x-1/2 rounded-b-md bg-zinc-400 sm:h-1"
        />
      </div>
    </figure>
  );
}
