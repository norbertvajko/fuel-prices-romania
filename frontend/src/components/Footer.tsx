const Footer = () => {
    return (
        <footer className="py-8 text-center space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">Termeni și Condiții</a>
                <span className="hidden sm:inline">·</span>
            </div>
            <p className="text-xs text-muted-foreground/60">
                © {new Date().getFullYear()} Prețuri Carburanți România. Toate drepturile rezervate.
            </p>
        </footer>
    );
};

export default Footer;