import React, { Component, useCallback, useEffect, useMemo, useRef } from 'react';
import Terminal from 'terminal-in-react';
import { COMMANDS } from '../../../../consts/analytics';
import { EVENT_KEYS } from '../../../../types/events';
import { useGeneralStore } from '../../../state';
import { useProjectStore } from '../../../state/project';
import { ElectronEvents, emitSocketEvent, openInNewTab, reportCommandExecuted, socket } from '../../../utils';
import styles from './terminal.module.css';


type CommandFunc = (args: string[], print: (res: string)=>void, runCommand: (command: string)=>void ) => void | string;

type Commands = {
  close: CommandFunc;
  start: CommandFunc;
  restart: CommandFunc;
  reload: CommandFunc;
  projects: CommandFunc;
  // switch: CommandFunc;
  // create: CommandFunc;
  // clone: CommandFunc;
  // open: CommandFunc;
  swagger: CommandFunc;
  git: CommandFunc;
  open: CommandFunc;
};
  
type CommandDescriptions<C extends Commands> = {
  [K in keyof C]: string;
};
  

const commandsDescription: CommandDescriptions<Commands & {'git': string}> = {
  close: "close mockingbird server",
  start: "start mockingbird server",
  restart: "restart mockingbird server",
  reload: "reload project data",
  projects: "list of projects",
  // switch: "switch to other project",
  // create: "create new project [projectName]",
  // clone: "clone existing project [projectName, remoteUrl]",
  // open: "create new project [projectName, projectPath]",
  swagger: "opens mockingbird swagger",
  git: 'all the git commands available here.',
  open: "open the project root folder in file manager"
}


export const CommandsTerminal = ()=> {
  const {activeProjectName} = useProjectStore();
  const {projectsNameList} = useGeneralStore()

  const terminalRef = useRef<any>(null);


  const commands: Commands = {
    close: (args, print, runCommand) => {
      emitSocketEvent(EVENT_KEYS.CLOSE_SERVER);
      reportCommandExecuted(COMMANDS.CLOSE_SERVER)
    },
    start:(args, print, runCommand) => {
      emitSocketEvent(EVENT_KEYS.START_SERVER, {projectName: activeProjectName});
      reportCommandExecuted(COMMANDS.START_SERVER)

    },
    restart: (args, print, runCommand) => {
      emitSocketEvent(EVENT_KEYS.RESTART_SERVER, {projectName: activeProjectName});
      reportCommandExecuted(COMMANDS.RESTART_SERVER)
    },
    reload: (args, print, runCommand) => {
      emitSocketEvent(EVENT_KEYS.RELOAD_PROJECT, {projectName: activeProjectName});
      reportCommandExecuted(COMMANDS.RESTART_SERVER)
    },
    projects: (args, print, runCommand) => {
      reportCommandExecuted(COMMANDS.PROJECTS)
      return projectsNameList.join('\n')

    },
    // switch:(args, print, runCommand) => {
      
    // },
    // create: (args, print, runCommand) => {
      
    // },
    // clone: (args, print, runCommand) => {
      
    // },
    // open: (args, print, runCommand) => {
      
    // },
    swagger: (args, print, runCommand) => {
      reportCommandExecuted(COMMANDS.SWAGGER)
      openInNewTab('localhost:1511/api-docs');
    },
    git: (args, print)=>{
      reportCommandExecuted(COMMANDS.GIT,{ details: args.slice(0,2).join(' ')})
      handleCommands(args, print)
    },
    open : (args, print)=>{
      ElectronEvents.sendMessage(EVENT_KEYS.OPEN_PROJECT_DIRECTORY)   
    }

  }

  const printInTerminal = (content: string | string[]) => {
      terminalRef.current.state.instances[0].instance.updater.enqueueSetState(
        terminalRef.current.state.instances[0].instance,
        {
          summary: [
            ...terminalRef.current.state.instances[0].instance.state.summary,
            ...(Array.isArray(content) ? content.map((c) => [c]) : [content]),
          ],
        }
      );
    };

   

    useEffect(()=>{
      const onEvent = (arg: any)=>{
        printInTerminal(arg.output)
      };

      socket.on(EVENT_KEYS.TERMINAL_COMMAND_OUTPUT,onEvent)

      return ()=>{
          socket.off(EVENT_KEYS.TERMINAL_COMMAND_OUTPUT,onEvent)
      }
    },[]);


    const handleCommands = (cmd: string[] | string, print: (message: string)=>void)=>{
      if(Array.isArray(cmd)){
        if(cmd[0].toLocaleLowerCase() === 'git'){
          emitSocketEvent(EVENT_KEYS.RUN_TERMINAL_COMMAND, {command:cmd.join(' '), projectName: activeProjectName})
        }else{
          print("command '" + cmd[0] +"' not found, try typing 'help' for commands list")
        }
      } else{
        if(cmd.toLocaleLowerCase().includes('git')){
          emitSocketEvent(EVENT_KEYS.RUN_TERMINAL_COMMAND, {command:cmd, projectName: activeProjectName})
        }else{
          print("command '" + cmd +"' not found, try typing 'help' for commands list")
        }

      }
    }

 
    return (
      <div
      className={styles.wrapper}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          width: '100%',
          position:'relative'
        }}
      >
        <Terminal
            ref={terminalRef}
            showActions={false}
            allowTabs={false}
            color='white'
            backgroundColor='black'
            barColor='black'
            outputColor='white'
            hideTopBar
            promptSymbol="$"
            prompt='white'
            style={{  fontWeight: "bold", fontSize: "1em" }}
            commands={commands}
            descriptions={commandsDescription}
            msg='welcome to Mockingbird terminal, type Help to see the command list.'
            commandPassThrough={handleCommands}
        />
      </div>
    );
  
}