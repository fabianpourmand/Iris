import os

def prepare_data():
    project_root = "/Users/fabian/Desktop/02_Current Projects/01_Apps/USB_AI_Assistant_Build_Guide"
    output_file = os.path.join(project_root, "project_context_for_notebooklm.md")
    
    files_to_include = [
        "README.md",
        "IMPLEMENTATION_GUIDE.md",
        "USB_ASSISTANT/README.md",
        "USB_ASSISTANT/ui/src/App.tsx",
        "USB_ASSISTANT/ui/src/pages/SetupPage.tsx",
        "USB_ASSISTANT/ui/src/pages/ChatPage.tsx",
        "USB_ASSISTANT/ui/src/components/Sidebar.tsx"
    ]
    
    research_dir = os.path.join(project_root, "usb_assistant_research")
    if os.path.exists(research_dir):
        for f in os.listdir(research_dir):
            if f.endswith(".md"):
                files_to_include.append(os.path.join("usb_assistant_research", f))

    with open(output_file, "w") as out:
        out.write("# IRIS Project Context for NotebookLM\n\n")
        out.write("This document contains the core documentation and source code for the IRIS project.\n\n")
        
        for file_path in files_to_include:
            abs_path = os.path.join(project_root, file_path)
            if os.path.exists(abs_path):
                out.write(f"## File: {file_path}\n\n")
                out.write("```\n")
                try:
                    with open(abs_path, "r") as f:
                        out.write(f.read())
                except Exception as e:
                    out.write(f"Error reading file: {e}")
                out.write("\n```\n\n")
            else:
                print(f"Warning: File not found {abs_path}")

    print(f"Project context saved to {output_file}")

if __name__ == "__main__":
    prepare_data()
