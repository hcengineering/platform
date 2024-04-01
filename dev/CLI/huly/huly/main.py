import typer
import subprocess

app = typer.Typer()

@app.callback()
def callback():
    """
    Awesome Portal Gun
    """


@app.command()
def shoot():
    """
    Shoot the portal gun
    """
    typer.echo("Shooting portal gun")


@app.command()
def fast_start():
    """
    Run the fast start script
    """
    typer.echo("Running fast start script...")
    try:
        subprocess.run(["sh", "./scripts/fast-start.sh"], check=True)
        typer.echo("Fast start completed successfully!")
    except subprocess.CalledProcessError as e:
        typer.echo(f"Error running fast start script: {e}")