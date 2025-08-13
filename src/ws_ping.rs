use std::time::Duration;
use actix::Actor;
use actix::AsyncContext;
use actix_web_actors::ws;

pub fn test_message<A>(ctx: &mut ws::WebsocketContext<A>)
where
    A: Actor<Context = ws::WebsocketContext<A>> + 'static,
{
    println!("-- INSTALL test message ---");
    ctx.run_interval(Duration::from_secs(5), |_, ctx| {
        println!("-- sending test message ---");
        ctx.text("test message from server");
    });
}
