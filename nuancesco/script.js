gsap.registerPlugin(ScrollTrigger);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    }
  });

  tl.to(".logo-container", {
    top: "5%",
    left: "5%",
    xPercent: 0,
    yPercent: 0,
    flexDirection: "row",
    gap: "0.5rem",
    alignItems: "center",
    transform: "none",
    ease: "power2.out"
  })
  .to(".logo", {
    width: 50,
  }, "<")
  .to(".brand-name", {
    fontSize: "1.25rem",
  }, "<");