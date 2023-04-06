interface ProgressBarProps {
    progress:number

}


export function ProgressBar(props: ProgressBarProps ){

    
   
    return( 
        <div className="h-3 rounded-xl bg-zinc-700 w-full mt-4">
        <div className="h-3 rounded bg-violet-600" style={{width: `${props.progress}%`}} role="progressbar" aria-label="Progresso de habitos completados nesse dia" aria-valuenow={props.progress} />
     </div>

    )

}