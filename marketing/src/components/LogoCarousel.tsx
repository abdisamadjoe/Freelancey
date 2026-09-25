"use client";

import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import Image from "next/image";

/**
 * The original "keydesign-advanced-carousel" widget is built on Swiper.js.
 * SingleFile only captured Swiper's frozen post-init DOM (duplicated slides,
 * inline transform offsets) with no JS to drive it, so this re-implements
 * the same widget using the real `swiper` package configured to match the
 * captured data-settings (5 slides per view desktop / 3 tablet, infinite
 * loop, no pagination). Swiper's own CSS is already present in
 * styles/combined.css (it was part of the site's original bundle), so no
 * additional stylesheet import is needed here.
 */
const baseLogos = [
  { src: "/images/97c97bebb6ef.svg", width: 110, height: 37, alt: "Partner logo" },
  { src: "/images/7f20a1fb3167.svg", width: 108, height: 21, alt: "Partner logo" },
  { src: "/images/46beef31478a.svg", width: 123, height: 39, alt: "Partner logo" },
  { src: "/images/7f73c3e620f6.svg", width: 121, height: 26, alt: "Partner logo" },
  { src: "/images/e0f2c3982ea7.svg", width: 98, height: 40, alt: "Partner logo" },
];

// Swiper's loop mode needs at least ~2x slidesPerView slides to loop
// smoothly; with only 5 real logos, repeat the set so loop mode works.
const logos = [...baseLogos, ...baseLogos, ...baseLogos];

export function LogoCarousel() {
  return (
    <div className="keydesign-carousel swiper" role="region" aria-roledescription="carousel" aria-label="Carousel">
      <Swiper
        modules={[Autoplay]}
        loop
        speed={500}
        spaceBetween={30}
        slidesPerView={5}
        autoplay={{ delay: 1800, disableOnInteraction: false }}
        breakpoints={{
          0: { slidesPerView: 2, spaceBetween: 20 },
          768: { slidesPerView: 3, spaceBetween: 20 },
          1024: { slidesPerView: 5, spaceBetween: 30 },
        }}
      >
        {logos.map((logo, i) => (
          <SwiperSlide key={i} style={{ width: 154 }}>
            <a href="#">
              <Image
                src={logo.src}
                width={logo.width}
                height={logo.height}
                alt={logo.alt}
                className="attachment-full size-full"
              />
            </a>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
