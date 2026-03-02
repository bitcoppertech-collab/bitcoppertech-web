import { useProjects } from "@/hooks/use-projects";
import { Sidebar } from "@/components/Sidebar";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Search, 
  ArrowRight,
  MoreVertical,
  Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useState } from "react";

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProjects = projects?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.client && p.client.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Projects</h1>
            <p className="text-muted-foreground">Manage your construction estimates and budgets.</p>
          </div>
          <CreateProjectDialog />
        </div>

        <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-center gap-4 shadow-sm">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search projects by name or client..." 
            className="border-none bg-transparent shadow-none focus-visible:ring-0 p-0 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-[220px] rounded-2xl bg-card" />
              <Skeleton className="h-[220px] rounded-2xl bg-card" />
              <Skeleton className="h-[220px] rounded-2xl bg-card" />
            </>
          ) : filteredProjects?.map((project) => (
            <Card key={project.id} className="group hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 bg-card">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center font-bold text-lg text-primary border border-border">
                    {project.name.substring(0, 2).toUpperCase()}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mb-auto">
                  <h3 className="font-bold text-xl mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {project.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {project.description || "No description provided."}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="font-normal text-muted-foreground bg-secondary/50">
                      {project.client || "No Client"}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={
                        project.status === 'completed' ? "border-emerald-500/30 text-emerald-500" :
                        "border-zinc-700 text-zinc-400"
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {project.createdAt ? format(new Date(project.createdAt), 'MMM d') : ''}
                  </div>
                  <Link href={`/projects/${project.id}`}>
                    <Button size="sm" className="bg-secondary hover:bg-primary hover:text-white text-foreground transition-colors group-hover:translate-x-1">
                      Open
                      <ArrowRight className="w-3 h-3 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredProjects?.length === 0 && !isLoading && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No projects found matching your search.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
