import photograph from "../../assets/birthday-celebration/disco-ball.webp";

export function DiscoBall() {
  return (
    <div className="celebration-disco" aria-hidden="true">
      <span className="celebration-disco-thread" />
      <div className="celebration-disco-swing">
        <img
          src={photograph}
          width={640}
          height={640}
          alt=""
          decoding="async"
        />
        <span className="celebration-disco-reflection" />
        <span className="celebration-disco-glint celebration-disco-glint-one" />
        <span className="celebration-disco-glint celebration-disco-glint-two" />
        <span className="celebration-disco-glint celebration-disco-glint-three" />
      </div>
    </div>
  );
}
