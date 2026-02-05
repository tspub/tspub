# VHS Demo Tape for tspub
# Generate with: vhs docs/demo.tape
# Install VHS: https://github.com/charmbracelet/vhs
#
# The current terminal.svg was recorded with:
#   asciinema rec demo.cast --command "bash record.sh" --cols 80 --rows 32
#   npx svg-term-cli --in demo.cast --out docs/terminal.svg --window --no-cursor --width 80 --height 32 --padding 16

Output docs/demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 900
Set Height 600
Set Theme "Catppuccin Mocha"
Set Padding 20
Set Margin 20
Set BorderRadius 10
Set TypingSpeed 40ms

# Init — scaffold from nothing
Type "tspub init my-awesome-lib"
Enter
Sleep 3s

# Build — fast esbuild + DTS
Type "tspub build"
Enter
Sleep 3s

# Check — 63 rules
Type "tspub check"
Enter
Sleep 3s

# Check --fix — auto-fix issues
Type "tspub check --fix"
Enter
Sleep 3s

# Doctor — environment health
Type "tspub doctor"
Enter
Sleep 3s

# Pack — preview what ships
Type "tspub pack"
Enter
Sleep 3s

# Publish dry-run
Type "tspub publish patch --dry-run"
Enter
Sleep 3s
